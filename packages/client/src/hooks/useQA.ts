import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// --- Types ---

export interface ChatSource {
  chunkId: string;
  documentId: string;
  documentName?: string;
  pageStart: number;
  pageEnd: number;
  score: number;
  textSnippet: string;
}

export interface ChatMessageRecord {
  _id: string;
  auditId: string;
  organizationId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  createdAt: string;
}

export interface QAResponse {
  answer: string;
  sources: ChatSource[];
}

// --- Queries ---

export function useChatHistory(
  auditId: string,
  params?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ["qa", "history", auditId, params],
    queryFn: async () => {
      const { data } = await apiClient.get("/qa/history", {
        params: { auditId, ...params },
      });
      return data.data as ChatMessageRecord[];
    },
    enabled: !!auditId,
  });
}

// --- Mutations ---

export function useAskQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      auditId,
      question,
    }: {
      auditId: string;
      question: string;
    }) => {
      try {
        const { data } = await apiClient.post("/qa/ask", { auditId, question });
        return data.data as QAResponse;
      } catch (error) {
        const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
        const serverMessage = axiosError.response?.data?.error?.message;
        throw new Error(serverMessage || "Failed to get AI response");
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["qa", "history", variables.auditId],
      });
    },
  });
}

export function useClearChatHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ auditId }: { auditId: string }) => {
      await apiClient.delete("/qa/history", { data: { auditId } });
      return { auditId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["qa", "history", variables.auditId],
      });
    },
  });
}
