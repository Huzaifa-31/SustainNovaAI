"use client";

import { useParams } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import {
  useDocuments,
  useUploadDocuments,
  useDeleteDocument,
  useRetryDocument,
  useAnalyzeDocument,
  useReanalyzeDocument,
  DocRecord,
} from "@/hooks/useDocuments";

// --- Helpers ---

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACTIVE_STATUSES = new Set(["queued", "parsing", "chunking", "embedding", "extracting", "generating_caps"]);

function getStatusBadge(status: DocRecord["status"]) {
  const isActive = ACTIVE_STATUSES.has(status);
  const styles: Record<string, string> = {
    uploaded: "bg-gray-100 text-gray-700",
    queued: "bg-blue-100 text-blue-700",
    parsing: "bg-yellow-100 text-yellow-700",
    chunking: "bg-yellow-100 text-yellow-700",
    embedding: "bg-purple-100 text-purple-700",
    extracting: "bg-orange-100 text-orange-700",
    generating_caps: "bg-indigo-100 text-indigo-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    uploaded: "Uploaded",
    queued: "Queued",
    parsing: "Extracting Text",
    chunking: "Chunking",
    embedding: "Embedding",
    extracting: "Analyzing",
    generating_caps: "Generating CAPs",
    completed: "Completed",
    failed: "Failed",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"} ${isActive ? "animate-pulse" : ""}`}>
      {isActive && (
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {labels[status] ?? status}
    </span>
  );
}

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  return "DOCX";
}

// --- Dropzone Component ---

function Dropzone({
  onFiles,
  isUploading,
}: {
  onFiles: (files: File[]) => void;
  isUploading: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (isUploading) return;

      const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
        [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(f.type),
      );
      if (droppedFiles.length > 0) onFiles(droppedFiles);
    },
    [onFiles, isUploading],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const selected = Array.from(e.target.files);
      if (selected.length > 0) onFiles(selected);
      // Reset so the same file can be selected again
      e.target.value = "";
    },
    [onFiles],
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        isDragOver
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx"
        onChange={handleInputChange}
        className="hidden"
      />
      <div className="mb-2 text-4xl">
        {isUploading ? "..." : "+"}
      </div>
      <p className="text-sm font-medium text-gray-700">
        {isUploading
          ? "Uploading..."
          : "Drop PDF/DOCX files here or click to browse"}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Supported: PDF, DOCX — Max 50 MB per file — Up to 10 files
      </p>
    </div>
  );
}

// --- Document Row ---

function DocumentRow({
  doc,
  onDelete,
  onRetry,
  onAnalyze,
  onReanalyze,
}: {
  doc: DocRecord;
  onDelete: (docId: string) => void;
  onRetry: (docId: string) => void;
  onAnalyze: (docId: string) => void;
  onReanalyze: (docId: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50">
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-600">
        {getFileIcon(doc.mimeType)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{doc.originalName}</p>
        <p className="text-xs text-gray-500">
          {formatFileSize(doc.fileSize)} —{" "}
          {new Date(doc.createdAt).toLocaleDateString()}
          {doc.pageCount > 0 && ` — ${doc.pageCount} pages`}
          {doc.processing.chunksGenerated > 0 && ` — ${doc.processing.chunksGenerated} chunks`}
        </p>
        {doc.status === "failed" && doc.errorMessage && (
          <p className="mt-0.5 text-xs text-red-600">{doc.errorMessage}</p>
        )}
      </div>

      {/* Status */}
      <div className="shrink-0">{getStatusBadge(doc.status)}</div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {doc.status === "uploaded" && (
          <button
            onClick={() => onAnalyze(doc._id)}
            className="rounded border border-indigo-300 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
          >
            Analyze
          </button>
        )}
        {doc.status === "completed" && (
          <button
            onClick={() => onReanalyze(doc._id)}
            className="rounded border border-indigo-300 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
          >
            Re-analyze
          </button>
        )}
        {doc.status === "failed" && (
          <button
            onClick={() => onRetry(doc._id)}
            className="rounded border border-yellow-300 px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-50"
          >
            Retry
          </button>
        )}
        <button
          onClick={() => onDelete(doc._id)}
          className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function DocumentsPage() {
  const { id: auditId } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useDocuments(auditId, { page, limit });
  const uploadMutation = useUploadDocuments();
  const deleteMutation = useDeleteDocument();
  const retryMutation = useRetryDocument();
  const analyzeMutation = useAnalyzeDocument();
  const reanalyzeMutation = useReanalyzeDocument();

  const handleUpload = useCallback(
    (files: File[]) => {
      uploadMutation.mutate({ auditId, files });
    },
    [auditId, uploadMutation],
  );

  const handleDelete = useCallback(
    (docId: string) => {
      if (!confirm("Delete this document?")) return;
      deleteMutation.mutate({ docId, auditId });
    },
    [auditId, deleteMutation],
  );

  const handleRetry = useCallback(
    (docId: string) => {
      retryMutation.mutate({ docId, auditId });
    },
    [auditId, retryMutation],
  );

  const handleAnalyze = useCallback(
    (docId: string) => {
      analyzeMutation.mutate({ docId, auditId });
    },
    [auditId, analyzeMutation],
  );

  const handleReanalyze = useCallback(
    (docId: string) => {
      if (!confirm("Re-analyze this document? Existing findings and CAPs will be replaced.")) return;
      reanalyzeMutation.mutate({ docId, auditId });
    },
    [auditId, reanalyzeMutation],
  );

  const documents = data?.documents ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Upload Documents</h3>
        <Dropzone onFiles={handleUpload} isUploading={uploadMutation.isPending} />
        {uploadMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            Upload failed: {(uploadMutation.error as Error)?.message ?? "Unknown error"}
          </p>
        )}
        {uploadMutation.isSuccess && (
          <p className="mt-2 text-sm text-green-600">
            {uploadMutation.data.length} document(s) uploaded! Click <strong>Analyze</strong> on each file to start AI processing.
          </p>
        )}
      </div>

      {/* Document List */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Documents <span className="text-sm font-normal text-gray-500">({total})</span>
          </h3>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            No documents uploaded yet. Drop files above to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentRow
                key={doc._id}
                doc={doc}
                onDelete={handleDelete}
                onRetry={handleRetry}
                onAnalyze={handleAnalyze}
                onReanalyze={handleReanalyze}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
