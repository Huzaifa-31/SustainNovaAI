import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// --- Types ---

export type DocumentStatusType =
  | "uploaded"
  | "queued"
  | "parsing"
  | "chunking"
  | "embedding"
  | "extracting"
  | "generating_caps"
  | "completed"
  | "failed";

export interface DocRecord {
  _id: string;
  auditId: string;
  organizationId: string;
  uploadedBy: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  status: DocumentStatusType;
  errorMessage?: string;
  checksum?: string;
  pageCount: number;
  pagesProcessed: number;
  metadata: {
    title?: string;
    author?: string;
    language?: string;
  };
  qualityReport: {
    totalPages: number;
    processedPages: number;
    ocrRequired: boolean;
    ocrPages: number[];
    unreadablePages: number[];
    summary: string;
  };
  processing: {
    chunksGenerated: number;
    embeddingsGenerated: number;
    capsGenerated?: number;
    startedAt?: string;
    completedAt?: string;
  };
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentListResponse {
  documents: DocRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface DocumentStatus {
  status: DocRecord["status"];
  processing: DocRecord["processing"];
  errorMessage?: string;
}

// --- Queries ---

export function useDocuments(
  auditId: string,
  params?: { status?: string; page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ["documents", auditId, params],
    queryFn: async () => {
      const { data } = await apiClient.get("/documents", {
        params: { auditId, ...params },
      });
      return {
        documents: data.data as DocRecord[],
        ...data.pagination,
      } as DocumentListResponse;
    },
    enabled: !!auditId,
    refetchInterval: (query) => {
      // Poll every 3s while any document is actively processing
      const docs = query.state.data?.documents;
      if (!docs) return false;
      const activeStatuses: DocumentStatusType[] = [
        "queued", "parsing", "chunking", "embedding", "extracting", "generating_caps",
      ];
      return docs.some((d) => activeStatuses.includes(d.status)) ? 3000 : false;
    },
  });
}

export function useDocument(docId: string) {
  return useQuery({
    queryKey: ["documents", "detail", docId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/documents/${docId}`);
      return data.data as DocRecord;
    },
    enabled: !!docId,
  });
}

export function useDocumentStatus(docId: string, enabled = true) {
  return useQuery({
    queryKey: ["documents", "status", docId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/documents/${docId}/status`);
      return data.data as DocumentStatus;
    },
    enabled: !!docId && enabled,
    refetchInterval: (query) => {
      // Poll every 3 seconds while processing
      const status = query.state.data?.status;
      const activeStatuses: DocumentStatusType[] = [
        "queued", "parsing", "chunking", "embedding", "extracting", "generating_caps",
      ];
      if (status && activeStatuses.includes(status)) {
        return 3000;
      }
      return false;
    },
  });
}

// --- Mutations ---

export function useUploadDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      auditId,
      files,
    }: {
      auditId: string;
      files: File[];
    }) => {
      const formData = new FormData();
      formData.append("auditId", auditId);
      files.forEach((file) => formData.append("files", file));

      const { data } = await apiClient.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data as DocRecord[];
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents", variables.auditId] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, auditId }: { docId: string; auditId: string }) => {
      await apiClient.delete(`/documents/${docId}`);
      return { docId, auditId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents", variables.auditId] });
    },
  });
}

export function useRetryDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, auditId }: { docId: string; auditId: string }) => {
      const { data } = await apiClient.post(`/documents/${docId}/retry`);
      return data.data as DocRecord;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["documents", "status", variables.docId] });
    },
  });
}

export function useAnalyzeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, auditId }: { docId: string; auditId: string }) => {
      const { data } = await apiClient.post(`/documents/${docId}/analyze`);
      return data.data as DocRecord;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents", variables.auditId] });
    },
  });
}

export function useReanalyzeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, auditId }: { docId: string; auditId: string }) => {
      const { data } = await apiClient.post(`/documents/${docId}/reanalyze`);
      return data.data as DocRecord;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents", variables.auditId] });
    },
  });
}
