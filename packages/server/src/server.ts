import { app } from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./config/database";
import { logger } from "./utils/logger";
import { createDocumentWorker } from "./queues/documentWorker";
import { vectorStoreService } from "./services/vectorStoreService";

async function bootstrap(): Promise<void> {
  await connectDatabase();

  // Initialize the Redis vector search index
  await vectorStoreService.ensureIndex();

  // Start the document processing worker
  const documentWorker = createDocumentWorker();

  app.listen(env.PORT, "0.0.0.0", () => {
    logger.info(`SustainNova AI server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    await documentWorker.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap().catch((error) => {
  const err = error as Error;
  logger.error({ err }, `Failed to start server: ${err.message}`);
  process.exit(1);
});
