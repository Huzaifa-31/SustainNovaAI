import crypto from "crypto";
import fs from "fs";
import path from "path";
import { DocumentModel, IDocument, Chunk } from "../../models";
import { Audit } from "../../models";
import { AppError } from "../../utils/AppError";
import { organizationService } from "../organizations/organizationService";
import { enqueueDocumentProcessing } from "../../queues/documentQueue";
import { vectorStoreService } from "../../services/vectorStoreService";

export interface UploadDocumentData {
  auditId: string;
  uploadedBy: string;
  file: Express.Multer.File;
}

export interface ListDocumentsOptions {
  auditId?: string;
  status?: string;
  page: number;
  limit: number;
}

class DocumentService {
  /**
   * Compute MD5 checksum of a file
   */
  private async computeChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("md5");
      const stream = fs.createReadStream(filePath);
      stream.on("error", reject);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
    });
  }

  /**
   * Upload a document — create DB record after multer has saved the file
   */
  async upload(data: UploadDocumentData): Promise<IDocument> {
    // Verify audit exists and user is a member of the org
    const audit = await Audit.findById(data.auditId);
    if (!audit) {
      // Clean up the uploaded file
      fs.unlinkSync(data.file.path);
      throw AppError.notFound("Audit not found");
    }

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      data.uploadedBy,
    );

    // Compute checksum
    const checksum = await this.computeChecksum(data.file.path);

    // Check for duplicate file in the same audit
    const existing = await DocumentModel.findOne({
      auditId: data.auditId,
      checksum,
      status: { $ne: "failed" },
    });

    if (existing) {
      // Remove the duplicate file
      fs.unlinkSync(data.file.path);
      throw AppError.conflict(
        `A file with the same content already exists: ${existing.originalName}`,
      );
    }

    // Create document record
    const doc = await DocumentModel.create({
      auditId: data.auditId,
      organizationId: audit.organizationId,
      uploadedBy: data.uploadedBy,
      fileName: data.file.filename,
      originalName: data.file.originalname,
      mimeType: data.file.mimetype,
      fileSize: data.file.size,
      storagePath: data.file.path,
      status: "uploaded",
      checksum,
      pageCount: 0,
      pagesProcessed: 0,
      metadata: {},
      qualityReport: {
        totalPages: 0,
        processedPages: 0,
        ocrRequired: false,
        ocrPages: [],
        unreadablePages: [],
        summary: "",
      },
      processing: {
        chunksGenerated: 0,
        embeddingsGenerated: 0,
      },
    });

    // Enqueue document processing job
    doc.status = "queued";
    await doc.save();
    await enqueueDocumentProcessing(doc._id.toString());

    return doc;
  }

  /**
   * Upload multiple documents
   */
  async uploadMultiple(
    auditId: string,
    uploadedBy: string,
    files: Express.Multer.File[],
  ): Promise<IDocument[]> {
    const results: IDocument[] = [];
    for (const file of files) {
      const doc = await this.upload({ auditId, uploadedBy, file });
      results.push(doc);
    }
    return results;
  }

  /**
   * List documents for an audit (with pagination)
   */
  async listForAudit(
    auditId: string,
    userId: string,
    options: { status?: string; page: number; limit: number },
  ): Promise<{ documents: IDocument[]; total: number }> {
    const audit = await Audit.findById(auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    const filter: Record<string, unknown> = { auditId };
    if (options.status) filter.status = options.status;

    const [documents, total] = await Promise.all([
      DocumentModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit),
      DocumentModel.countDocuments(filter),
    ]);

    return { documents, total };
  }

  /**
   * Get a document by ID
   */
  async getById(id: string, userId: string): Promise<IDocument> {
    const doc = await DocumentModel.findById(id).populate("auditId");
    if (!doc) throw AppError.notFound("Document not found");

    const audit = await Audit.findById(doc.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    return doc;
  }

  /**
   * Get document status (for polling)
   */
  async getStatus(
    id: string,
    userId: string,
  ): Promise<{
    status: IDocument["status"];
    processing: IDocument["processing"];
    errorMessage?: string;
  }> {
    const doc = await this.getById(id, userId);
    return {
      status: doc.status,
      processing: doc.processing,
      errorMessage: doc.errorMessage,
    };
  }

  /**
   * Delete a document (removes file + DB record)
   */
  async delete(id: string, userId: string): Promise<void> {
    const doc = await DocumentModel.findById(id);
    if (!doc) throw AppError.notFound("Document not found");

    const audit = await Audit.findById(doc.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    // Delete file from disk
    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      fs.unlinkSync(doc.storagePath);
    }

    // Delete associated chunks from Redis vector store
    await vectorStoreService.removeDocumentChunks(doc._id.toString());

    // Delete associated chunks from MongoDB
    await Chunk.deleteMany({ documentId: doc._id });

    await doc.deleteOne();
  }

  /**
   * Retry a failed document
   */
  async retry(id: string, userId: string): Promise<IDocument> {
    const doc = await DocumentModel.findById(id);
    if (!doc) throw AppError.notFound("Document not found");

    if (doc.status !== "failed") {
      throw AppError.badRequest("Only documents with 'failed' status can be retried");
    }

    const audit = await Audit.findById(doc.auditId);
    if (!audit) throw AppError.notFound("Audit not found");

    await organizationService.verifyMembership(
      audit.organizationId.toString(),
      userId,
    );

    // Verify file still exists
    if (!fs.existsSync(doc.storagePath)) {
      throw AppError.badRequest(
        "Original file no longer exists. Please re-upload the document.",
      );
    }

    // Clean up old chunks from previous attempt (Redis + MongoDB)
    await vectorStoreService.removeDocumentChunks(doc._id.toString());
    await Chunk.deleteMany({ documentId: doc._id });

    // Reset status and re-enqueue for processing
    doc.status = "queued";
    doc.errorMessage = undefined;
    doc.processing = {
      chunksGenerated: 0,
      embeddingsGenerated: 0,
    };
    doc.processedAt = undefined;
    await doc.save();

    await enqueueDocumentProcessing(doc._id.toString());

    return doc;
  }
}

export const documentService = new DocumentService();
