import { redisConnection } from "../queues/documentQueue";
import { EMBEDDING_DIMENSIONS } from "./embeddingService";
import pino from "pino";

const logger = pino({ name: "VectorStore" });

// Redis key prefix for chunk vectors
const CHUNK_KEY_PREFIX = "chunk:";
const INDEX_NAME = "idx:chunks";

class VectorStoreService {
  private indexReady = false;

  /**
   * Create the RediSearch HNSW vector index if it doesn't exist
   */
  async ensureIndex(): Promise<void> {
    try {
      // Check if index already exists
      const info = await redisConnection.call("FT.INFO", INDEX_NAME) as unknown[];
      if (info) {
        this.indexReady = true;
        logger.info("Vector index already exists");
        return;
      }
    } catch {
      // Index doesn't exist, create it
    }

    try {
      await redisConnection.call(
        "FT.CREATE",
        INDEX_NAME,
        "ON", "HASH",
        "PREFIX", "1", CHUNK_KEY_PREFIX,
        "SCHEMA",
        "auditId", "TAG",
        "organizationId", "TAG",
        "documentId", "TAG",
        "chunkIndex", "NUMERIC",
        "pageStart", "NUMERIC",
        "pageEnd", "NUMERIC",
        "text", "TEXT",
        "embedding", "VECTOR", "HNSW", "6",
        "TYPE", "FLOAT32",
        "DIM", String(EMBEDDING_DIMENSIONS),
        "DISTANCE_METRIC", "COSINE",
      );

      this.indexReady = true;
      logger.info(
        { dimensions: EMBEDDING_DIMENSIONS },
        "Vector index created",
      );
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes("Index already exists")) {
        this.indexReady = true;
        return;
      }
      logger.error({ error: err.message }, "Failed to create vector index");
      throw error;
    }
  }

  /**
   * Store a chunk's embedding and metadata in Redis
   */
  async storeChunk(chunk: {
    chunkId: string;
    auditId: string;
    organizationId: string;
    documentId: string;
    chunkIndex: number;
    pageStart: number;
    pageEnd: number;
    text: string;
    embedding: number[];
  }): Promise<void> {
    const key = `${CHUNK_KEY_PREFIX}${chunk.chunkId}`;

    // Convert embedding to Float32 binary buffer
    const embeddingBuffer = Buffer.from(
      new Float32Array(chunk.embedding).buffer,
    );

    await redisConnection.hset(key, {
      auditId: chunk.auditId,
      organizationId: chunk.organizationId,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
      text: chunk.text,
      embedding: embeddingBuffer,
    });
  }

  /**
   * Store multiple chunks in a pipeline (batch operation)
   */
  async storeChunks(
    chunks: Array<{
      chunkId: string;
      auditId: string;
      organizationId: string;
      documentId: string;
      chunkIndex: number;
      pageStart: number;
      pageEnd: number;
      text: string;
      embedding: number[];
    }>,
  ): Promise<void> {
    const pipeline = redisConnection.pipeline();

    for (const chunk of chunks) {
      const key = `${CHUNK_KEY_PREFIX}${chunk.chunkId}`;
      const embeddingBuffer = Buffer.from(
        new Float32Array(chunk.embedding).buffer,
      );

      pipeline.hset(key, {
        auditId: chunk.auditId,
        organizationId: chunk.organizationId,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        text: chunk.text,
        embedding: embeddingBuffer,
      });
    }

    await pipeline.exec();
  }

  /**
   * KNN similarity search — find top-K most similar chunks for a query
   */
  async search(
    queryEmbedding: number[],
    options: {
      auditId: string;
      topK?: number;
      threshold?: number;
    },
  ): Promise<
    Array<{
      chunkId: string;
      text: string;
      documentId: string;
      pageStart: number;
      pageEnd: number;
      score: number;
    }>
  > {
    const topK = options.topK ?? 6;
    const queryBuffer = Buffer.from(
      new Float32Array(queryEmbedding).buffer,
    );

    // FT.SEARCH with KNN query filtered by auditId
    const results = await redisConnection.call(
      "FT.SEARCH",
      INDEX_NAME,
      `(@auditId:{${options.auditId}}) => [KNN ${topK} @embedding $query_vec AS score]`,
      "PARAMS", "2", "query_vec", queryBuffer,
      "RETURN", "6", "text", "documentId", "pageStart", "pageEnd", "chunkIndex", "score",
      "SORTBY", "score", "ASC",
      "DIALECT", "2",
    ) as unknown[];

    return this.parseSearchResults(results, options.threshold);
  }

  /**
   * Remove all chunks for a document from Redis
   */
  async removeDocumentChunks(documentId: string): Promise<number> {
    // Search for all chunks belonging to this document
    let cursor = "0";
    let removed = 0;

    do {
      const result = await redisConnection.call(
        "FT.SEARCH",
        INDEX_NAME,
        `@documentId:{${documentId}}`,
        "NOCONTENT",
        "LIMIT", "0", "100",
      ) as unknown[];

      const totalResults = Number(result[0]);
      if (totalResults === 0) break;

      // result[1], result[3], etc. are the keys
      const keys: string[] = [];
      for (let i = 1; i < result.length; i += 2) {
        if (typeof result[i] === "string") {
          keys.push(result[i] as string);
        }
      }

      if (keys.length > 0) {
        await redisConnection.del(...keys);
        removed += keys.length;
      }

      // If we got fewer than 100, we're done
      if (keys.length < 100) break;
    } while (true);

    return removed;
  }

  /**
   * Parse FT.SEARCH results into structured array
   */
  private parseSearchResults(
    results: unknown,
    threshold?: number,
  ): Array<{
    chunkId: string;
    text: string;
    documentId: string;
    pageStart: number;
    pageEnd: number;
    score: number;
  }> {
    const arr = results as unknown[];
    const totalResults = Number(arr[0]);
    if (totalResults === 0) return [];

    const chunks: Array<{
      chunkId: string;
      text: string;
      documentId: string;
      pageStart: number;
      pageEnd: number;
      score: number;
    }> = [];

    // Results format: [total, key1, [field1, val1, field2, val2, ...], key2, [...], ...]
    for (let i = 1; i < arr.length; i += 2) {
      const key = arr[i] as string;
      const fields = arr[i + 1] as string[];

      const fieldMap: Record<string, string> = {};
      for (let j = 0; j < fields.length; j += 2) {
        fieldMap[fields[j]] = fields[j + 1];
      }

      // Score is cosine distance (0 = identical, 2 = opposite)
      // Convert to similarity: 1 - distance
      const distance = parseFloat(fieldMap.score || "0");
      const similarity = 1 - distance / 2; // Normalize cosine distance to 0-1

      if (threshold && similarity < threshold) continue;

      chunks.push({
        chunkId: key.replace(CHUNK_KEY_PREFIX, ""),
        text: fieldMap.text || "",
        documentId: fieldMap.documentId || "",
        pageStart: parseInt(fieldMap.pageStart || "0"),
        pageEnd: parseInt(fieldMap.pageEnd || "0"),
        score: similarity,
      });
    }

    return chunks;
  }
}

export const vectorStoreService = new VectorStoreService();
