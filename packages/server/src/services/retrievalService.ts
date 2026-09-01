import { embeddingService } from "./embeddingService";
import { vectorStoreService } from "./vectorStoreService";
import pino from "pino";

const logger = pino({ name: "RetrievalService" });

export interface RetrievedChunk {
  chunkId: string;
  text: string;
  documentId: string;
  pageStart: number;
  pageEnd: number;
  score: number;
}

class RetrievalService {
  /**
   * Semantic search — embed query and find top-K similar chunks
   * Architecture: top-6 chunks, threshold >= 0.7
   */
  async search(
    query: string,
    auditId: string,
    options?: { topK?: number; threshold?: number },
  ): Promise<RetrievedChunk[]> {
    const topK = options?.topK ?? 6;
    const threshold = options?.threshold ?? 0.7;

    logger.info({ auditId, query: query.substring(0, 80), topK }, "Semantic search");

    // Step 1: Embed the query
    const queryEmbedding = await embeddingService.embedQuery(query);

    // Step 2: KNN search in Redis
    const results = await vectorStoreService.search(queryEmbedding, {
      auditId,
      topK,
      threshold,
    });

    logger.info(
      { auditId, results: results.length },
      "Search completed",
    );

    return results;
  }

  /**
   * Get context string for LLM prompts from retrieved chunks
   */
  async getContext(
    query: string,
    auditId: string,
    options?: { topK?: number; threshold?: number },
  ): Promise<{ context: string; sources: RetrievedChunk[] }> {
    const chunks = await this.search(query, auditId, options);

    const context = chunks
      .map(
        (c, i) =>
          `[Source ${i + 1}: Page ${c.pageStart}${c.pageEnd > c.pageStart ? `-${c.pageEnd}` : ""}]\n${c.text}`,
      )
      .join("\n\n");

    return { context, sources: chunks };
  }
}

export const retrievalService = new RetrievalService();
