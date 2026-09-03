import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { env } from "../config/env";
import { googleKeyManager } from "./googleKeyManager";
import pino from "pino";

const logger = pino({ name: "EmbeddingService" });

// gemini-embedding-001 default output: 3072 dimensions
const EMBEDDING_DIMENSIONS = 3072;
const BATCH_SIZE = 100;

class EmbeddingService {
  private createEmbeddings(apiKey: string) {
    return new GoogleGenerativeAIEmbeddings({
      model: env.GOOGLE_EMBEDDING_MODEL,
      apiKey,
    });
  }

  /**
   * Generate embeddings for a batch of texts
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    return googleKeyManager.withFallback(async (apiKey) => {
      const embeddings = this.createEmbeddings(apiKey);
      const allEmbeddings: number[][] = [];

      // Process in batches of BATCH_SIZE
      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        logger.info(
          { batchSize: batch.length, offset: i },
          "Generating embeddings batch",
        );

        const batchEmbeddings = await embeddings.embedDocuments(batch);
        allEmbeddings.push(...batchEmbeddings);
      }

      logger.info(
        { total: texts.length, embeddings: allEmbeddings.length },
        "Embeddings generated",
      );

      return allEmbeddings;
    });
  }

  /**
   * Generate embedding for a single query text
   */
  async embedQuery(text: string): Promise<number[]> {
    return googleKeyManager.withFallback(async (apiKey) => {
      const embeddings = this.createEmbeddings(apiKey);
      const embedding = await embeddings.embedQuery(text);
      return embedding;
    });
  }

  get dimensions(): number {
    return EMBEDDING_DIMENSIONS;
  }
}

export const embeddingService = new EmbeddingService();
export { EMBEDDING_DIMENSIONS, BATCH_SIZE };
