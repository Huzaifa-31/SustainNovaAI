import { Worker, Job } from "bullmq";
import { redisConnection, ProcessDocumentJob } from "./documentQueue";
import { DocumentModel } from "../models/Document";
import { Chunk } from "../models/Chunk";
import { textExtractionService } from "../services/textExtractionService";
import { textChunkingService } from "../services/textChunkingService";
import { embeddingService } from "../services/embeddingService";
import { vectorStoreService } from "../services/vectorStoreService";
import { findingExtractionService } from "../services/findingExtractionService";
import { capGenerationService } from "../services/capGenerationService";
import { notificationService } from "../modules/notifications/notificationService";
import pino from "pino";

const logger = pino({ name: "DocumentWorker" });

async function processDocument(job: Job<ProcessDocumentJob>): Promise<void> {
  const { documentId } = job.data;

  logger.info({ documentId, jobId: job.id }, "Processing document");

  const doc = await DocumentModel.findById(documentId);
  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }

  try {
    // Step 1: Update status to parsing
    doc.status = "parsing";
    doc.processing.startedAt = new Date();
    await doc.save();

    // Step 2: Extract text
    logger.info({ documentId }, "Extracting text");
    const extraction = await textExtractionService.extract(
      doc.storagePath,
      doc.mimeType,
    );

    // Update document metadata from extraction
    doc.pageCount = extraction.pageCount;
    doc.pagesProcessed = extraction.pages.length;
    doc.metadata.title = extraction.metadata.title || doc.metadata.title;
    doc.metadata.author = extraction.metadata.author || doc.metadata.author;
    doc.metadata.language = extraction.metadata.language || doc.metadata.language;
    doc.qualityReport.totalPages = extraction.pageCount;
    doc.qualityReport.processedPages = extraction.pages.length;
    doc.qualityReport.summary = `${extraction.pages.length}/${extraction.pageCount} pages processed`;

    await doc.save();

    // Step 3: Update status to chunking
    doc.status = "chunking";
    await doc.save();

    // Clean up any existing chunks (from previous retry attempts)
    await Chunk.deleteMany({ documentId: doc._id });

    // Step 4: Chunk text
    logger.info({ documentId }, "Chunking text");
    const chunks = await textChunkingService.chunkPages(extraction.pages);

    if (chunks.length === 0) {
      throw new Error("No text content extracted from document");
    }

    // Step 5: Save chunks to DB (bulk insert)
    logger.info({ documentId, chunkCount: chunks.length }, "Saving chunks");
    const chunkDocs = chunks.map((chunk) => ({
      documentId: doc._id,
      auditId: doc.auditId,
      organizationId: doc.organizationId,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
      sectionTitle: chunk.sectionTitle,
      tokenCount: chunk.tokenCount,
    }));

    await Chunk.insertMany(chunkDocs);

    // Step 6: Update status to embedding
    doc.status = "embedding";
    await doc.save();

    // Step 7: Generate embeddings for all chunks
    logger.info({ documentId, chunkCount: chunks.length }, "Generating embeddings");
    const texts = chunks.map((c) => c.text);
    const embeddings = await embeddingService.embedBatch(texts);

    // Step 8: Save embeddings to MongoDB
    const savedChunks = await Chunk.find({ documentId: doc._id }).sort({ chunkIndex: 1 });
    for (let i = 0; i < savedChunks.length; i++) {
      if (embeddings[i]) {
        savedChunks[i].embedding = embeddings[i];
        await savedChunks[i].save();
      }
    }

    // Step 9: Store embeddings in Redis vector index
    logger.info({ documentId }, "Storing vectors in Redis");
    await vectorStoreService.ensureIndex();

    const redisChunks = savedChunks.map((chunk, i) => ({
      chunkId: chunk._id.toString(),
      auditId: doc.auditId.toString(),
      organizationId: doc.organizationId.toString(),
      documentId: doc._id.toString(),
      chunkIndex: chunk.chunkIndex,
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
      text: chunk.text,
      embedding: embeddings[i] || [],
    }));

    await vectorStoreService.storeChunks(redisChunks);

    // Step 10: Update status to extracting
    doc.status = "extracting";
    await doc.save();

    // Step 11: Extract findings using LLM
    logger.info({ documentId }, "Extracting findings");
    const findingCount = await findingExtractionService.extractFromDocument(
      doc._id.toString(),
    );

    // Step 12: Generate CAPs from findings
    doc.status = "generating_caps";
    await doc.save();

    logger.info({ documentId, auditId: doc.auditId.toString() }, "Generating CAPs");
    const capsGenerated = await capGenerationService.generateForAudit(
      doc.auditId.toString(),
    );

    // Step 13: Update document with final results
    doc.processing.chunksGenerated = chunks.length;
    doc.processing.embeddingsGenerated = embeddings.length;
    doc.processing.capsGenerated = capsGenerated;
    doc.status = "completed";
    doc.processing.completedAt = new Date();
    doc.processedAt = new Date();
    await doc.save();

    logger.info(
      { documentId, chunks: chunks.length, embeddings: embeddings.length, findings: findingCount, capsGenerated },
      "Document processing completed",
    );

    // Notify uploader and org members
    try {
      await notificationService.notifyOrganizationMembers(
        doc.organizationId.toString(),
        {
          type: "processing_completed",
          title: "Document processing completed",
          message: `"${doc.originalName}" has been processed. ${findingCount} finding(s) and ${capsGenerated} CAP(s) generated.`,
          entityId: doc._id.toString(),
          entityType: "document",
        },
        { excludeUserId: doc.uploadedBy.toString() },
      );

      await notificationService.create({
        userId: doc.uploadedBy.toString(),
        organizationId: doc.organizationId.toString(),
        type: "processing_completed",
        title: "Document processing completed",
        message: `"${doc.originalName}" has been processed. ${findingCount} finding(s) and ${capsGenerated} CAP(s) generated.`,
        entityId: doc._id.toString(),
        entityType: "document",
      });
    } catch (notifyError) {
      logger.warn({ notifyError }, "Failed to send processing_completed notification");
    }
  } catch (error) {
    // Mark document as failed
    doc.status = "failed";
    doc.errorMessage = error instanceof Error ? error.message : "Unknown error";
    await doc.save();

    logger.error(
      { documentId, error: doc.errorMessage },
      "Document processing failed",
    );

    // Notify uploader of failure
    try {
      await notificationService.create({
        userId: doc.uploadedBy.toString(),
        organizationId: doc.organizationId.toString(),
        type: "processing_failed",
        title: "Document processing failed",
        message: `"${doc.originalName}" could not be processed: ${doc.errorMessage}`,
        entityId: doc._id.toString(),
        entityType: "document",
      });
    } catch (notifyError) {
      logger.warn({ notifyError }, "Failed to send processing_failed notification");
    }

    throw error; // Re-throw so BullMQ can retry
  }
}

// Create the worker
export function createDocumentWorker(): Worker<ProcessDocumentJob> {
  const worker = new Worker<ProcessDocumentJob>(
    "document-processing",
    processDocument,
    {
      connection: redisConnection,
      concurrency: 2, // Process 2 documents at a time
    },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, error: err.message, attempt: job?.attemptsMade },
      "Job failed",
    );
  });

  logger.info("Document processing worker started");

  return worker;
}
