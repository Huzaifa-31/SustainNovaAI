import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { env } from "../config/env";
import pino from "pino";

const logger = pino({ name: "EmbeddingService" });

// Google text-embedding-004: 768 dimensions
const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 100;

class EmbeddingService {
  private embeddings: GoogleGenerativeAIEmbeddings;

  constructor() {
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      model: env.GOOGLE_EMBEDDING_MODEL,
      apiKey: env.GOOGLE_API_KEY,
    });
  }

  /**
   * Generate embeddings for a batch of texts
   * Returns array of 1536-dimensional vectors
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const allEmbeddings: number[][] = [];

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      logger.info(
        { batchSize: batch.length, offset: i },
        "Generating embeddings batch",
      );

      const batchEmbeddings = await this.embeddings.embedDocuments(batch);
      allEmbeddings.push(...batchEmbeddings);
    }

    logger.info(
      { total: texts.length, embeddings: allEmbeddings.length },
      "Embeddings generated",
    );

    return allEmbeddings;
  }

  /**
   * Generate embedding for a single query text
   */
  async embedQuery(text: string): Promise<number[]> {
    const embedding = await this.embeddings.embedQuery(text);
    return embedding;
  }

  get dimensions(): number {
    return EMBEDDING_DIMENSIONS;
  }
}

export const embeddingService = new EmbeddingService();
export { EMBEDDING_DIMENSIONS, BATCH_SIZE };
