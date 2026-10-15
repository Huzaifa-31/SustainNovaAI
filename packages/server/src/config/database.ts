import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

export async function connectDatabase(): Promise<void> {
  try {
    // Mask password in URI for safe logging
    const maskedUri = env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
    logger.info(`Connecting to MongoDB at: ${maskedUri}`);
    await mongoose.connect(env.MONGODB_URI);
    logger.info("MongoDB connected successfully");
  } catch (error) {
    const err = error as Error;
    logger.error({ err }, `MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    logger.error({ error: err }, "MongoDB connection error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

/**
 * Executes a function within a transaction if replica set is available,
 * otherwise falls back gracefully to non-transactional execution on standalone instances.
 */
export async function withTransaction<T>(
  fn: (session?: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
  let session: mongoose.ClientSession | undefined;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction().catch(() => {});
    }
    const err = error as Error;
    const isStandaloneError =
      err.message?.includes("replica set") ||
      err.message?.includes("Transaction numbers are only allowed") ||
      (error as { code?: number }).code === 20;

    if (isStandaloneError) {
      return fn(undefined);
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
}

