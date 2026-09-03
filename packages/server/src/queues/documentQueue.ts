import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";

// Shared Redis connection
export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Document processing queue
export const documentQueue = new Queue("document-processing", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: "exponential",
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export interface ProcessDocumentJob {
  documentId: string;
}

/**
 * Add a document processing job to the queue
 */
export async function enqueueDocumentProcessing(documentId: string): Promise<void> {
  await documentQueue.add("process-document", {
    documentId,
  } satisfies ProcessDocumentJob);
}
