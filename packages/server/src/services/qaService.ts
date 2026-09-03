import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "../config/env";
import { ChatMessage } from "../models";
import { retrievalService } from "./retrievalService";
import { DocumentModel } from "../models/Document";
import { AppError } from "../utils/AppError";
import pino from "pino";

const logger = pino({ name: "QAService" });

const SYSTEM_PROMPT = `You are SustainNova AI, an expert assistant for sustainability, social compliance, and HRDD audits.

You answer questions using ONLY the provided context from uploaded audit documents. Follow these rules:

1. ONLY use information from the provided context. Do not make up facts.
2. Always cite your sources using the format [Source N, Page X] where N matches the source number and X is the page number.
3. If the context does not contain enough information to answer the question, say so clearly and suggest what documents might be needed.
4. Be concise, professional, and actionable.
5. When discussing findings, include the severity level if mentioned.
6. When discussing corrective actions, include timelines and responsible parties if available.
7. Use markdown formatting for clarity (bold for key terms, bullet points for lists).`;

export interface QAResponse {
  answer: string;
  sources: {
    chunkId: string;
    documentId: string;
    documentName?: string;
    pageStart: number;
    pageEnd: number;
    score: number;
    textSnippet: string;
  }[];
}

class QAService {
  private llm: ChatGoogleGenerativeAI;

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      model: env.GOOGLE_CHAT_MODEL,
      apiKey: env.GOOGLE_API_KEY,
      temperature: 0.3,
      maxOutputTokens: 2048,
    });
  }

  /**
   * Answer a question using RAG (retrieve + generate)
   */
  async ask(
    auditId: string,
    organizationId: string,
    userId: string,
    question: string,
  ): Promise<QAResponse> {
    // Step 1: Retrieve relevant chunks
    const { context, sources } = await retrievalService.getContext(
      question,
      auditId,
      { topK: 8, threshold: 0.6 },
    );

    if (!context) {
      return {
        answer:
          "I couldn't find any relevant information in the uploaded documents to answer your question. Please make sure documents have been processed and try rephrasing your question.",
        sources: [],
      };
    }

    // Step 2: Get recent chat history for context (last 6 messages)
    const history = await ChatMessage.find({ auditId })
      .sort({ createdAt: -1 })
      .limit(6);

    const historyMessages = history.reverse().map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Step 3: Build the prompt
    const userMessage = `Context from audit documents:
${context}

---

Question: ${question}`;

    // Step 4: Call LLM
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...historyMessages,
      { role: "user", content: userMessage },
    ];

    logger.info(
      {
        auditId,
        questionLength: question.length,
        contextLength: context.length,
        sourceCount: sources.length,
        historyCount: historyMessages.length,
      },
      "Generating Q&A response",
    );

    let answer: string;
    try {
      const response = await this.llm.invoke(messages);
      answer =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);
    } catch (error) {
      const err = error as Error;
      const message = err.message || String(error);

      logger.error({ auditId, error: message }, "Gemini Q&A failed");

      if (message.includes("429") || message.includes("quota") || message.includes("rate limit")) {
        throw AppError.tooManyRequests(
          "AI quota exceeded. The Gemini free tier allows a limited number of requests per day. Please wait a moment or check your API key plan.",
        );
      }

      throw AppError.internal("Failed to generate AI response. Please try again.");
    }

    // Step 5: Enrich sources with document names
    const enrichedSources = await Promise.all(
      sources.map(async (source) => {
        const doc = await DocumentModel.findById(source.documentId).select(
          "originalName",
        );
        return {
          chunkId: source.chunkId,
          documentId: source.documentId,
          documentName: doc?.originalName,
          pageStart: source.pageStart,
          pageEnd: source.pageEnd,
          score: source.score,
          textSnippet: source.text.substring(0, 200),
        };
      }),
    );

    // Step 6: Save both messages to DB
    await ChatMessage.create([
      {
        auditId,
        organizationId,
        userId,
        role: "user",
        content: question,
      },
      {
        auditId,
        organizationId,
        userId,
        role: "assistant",
        content: answer,
        sources: enrichedSources,
      },
    ]);

    return { answer, sources: enrichedSources };
  }

  /**
   * Get chat history for an audit
   */
  async getHistory(
    auditId: string,
    page: number,
    limit: number,
  ): Promise<{ messages: typeof ChatMessage.prototype[]; total: number }> {
    const [messages, total] = await Promise.all([
      ChatMessage.find({ auditId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ChatMessage.countDocuments({ auditId }),
    ]);

    return { messages: messages.reverse(), total };
  }

  /**
   * Clear chat history for an audit
   */
  async clearHistory(auditId: string): Promise<void> {
    await ChatMessage.deleteMany({ auditId });
  }
}

export const qaService = new QAService();
