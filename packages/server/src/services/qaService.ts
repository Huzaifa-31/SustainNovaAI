import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "../config/env";
import { ChatMessage } from "../models";
import { retrievalService } from "./retrievalService";
import { DocumentModel } from "../models/Document";
import { AppError } from "../utils/AppError";
import { googleKeyManager } from "./googleKeyManager";
import pino from "pino";
import type { QuotaErrorDetails } from "./googleKeyManager";

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

type GeminiContentBlock = { text?: unknown };

function extractGeminiText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (block && typeof block === "object") {
          const text = (block as GeminiContentBlock).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (content && typeof content === "object") {
    const text = (content as GeminiContentBlock).text;
    return typeof text === "string" ? text : "";
  }

  return "";
}

function normalizeStoredAssistantContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    const text = extractGeminiText(parsed);
    return text || content;
  } catch {
    return content;
  }
}

class QAService {
  private createLLM(apiKey: string) {
    return new ChatGoogleGenerativeAI({
      model: env.GOOGLE_CHAT_MODEL,
      apiKey,
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
    // Steps 1-4: retrieve context, build prompt, call LLM — all wrapped so
    // embedding quota errors and generation quota errors return the same
    // clear 429/RATE_LIMIT_EXCEEDED response instead of a generic 500.
    let context: string;
    let sources: Awaited<ReturnType<typeof retrievalService.getContext>>["sources"];

    try {
      const result = await retrievalService.getContext(question, auditId, {
        topK: 8,
        threshold: 0.6,
      });
      context = result.context;
      sources = result.sources;

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
        content:
          msg.role === "assistant"
            ? normalizeStoredAssistantContent(msg.content)
            : msg.content,
      }));

      // Step 3: Build the prompt
      const userMessage = `Context from audit documents:\n${context}\n\n---\n\nQuestion: ${question}`;

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

      const response = await googleKeyManager.withFallback((apiKey) =>
        this.createLLM(apiKey).invoke(messages),
      );
      const answer = extractGeminiText(response.content);
      if (!answer) {
        throw new Error("Gemini returned an empty text response");
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
    } catch (error) {
      const err = error as Error;
      const message = err.message || String(error);
      const details: QuotaErrorDetails = googleKeyManager.classifyError(error);

      logger.error(
        {
          auditId,
          error: message,
          isRateLimit: details.isRateLimit,
          isDailyQuota: details.isDailyQuota,
        },
        "Gemini Q&A failed",
      );

      if (details.isRateLimit) {
        throw AppError.tooManyRequests(
          "AI rate limit reached (too many requests per minute). " +
            "The system already retried with backoff and fallback keys. " +
            "Please wait 30-60 seconds and try again, or upgrade your Google API plan.",
        );
      }

      if (details.isDailyQuota || details.isQuotaError) {
        throw AppError.tooManyRequests(
          "AI daily quota exceeded for the configured Google API keys. " +
            "If you added a second key, ensure it belongs to a *different* Google project " +
            "(quotas are project-level). Please wait for the daily reset or upgrade your plan.",
        );
      }

      throw AppError.internal(
        "Failed to generate AI response. Please try again.",
      );
    }
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

    const normalizedMessages = messages.reverse().map((message) => {
      if (message.role === "assistant") {
        message.content = normalizeStoredAssistantContent(message.content);
      }
      return message;
    });

    return { messages: normalizedMessages, total };
  }

  /**
   * Clear chat history for an audit
   */
  async clearHistory(auditId: string): Promise<void> {
    await ChatMessage.deleteMany({ auditId });
  }
}

export const qaService = new QAService();
