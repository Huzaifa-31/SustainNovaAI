import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// --- Types ---

export type FindingSeverity = "Critical" | "High" | "Medium" | "Low";
export type FindingCategory =
  | "Labour & HR"
  | "Safety"
  | "Environment"
  | "Governance"
  | "Worker Wellbeing"
  | "Grievance & Harassment"
  | "Wages & Working Hours";
export type ReviewStatus =
  | "ai_generated"
  | "needs_review"
  | "approved"
  | "rejected";
export type ConfidenceSignal =
  | "strong_evidence"
  | "limited_evidence"
  | "needs_review"
  | "evidence_not_found";

export interface FindingRecord {
  _id: string;
  auditId: string;
  organizationId: string;
  documentId?: string;
  title: string;
  description: string;
  category: FindingCategory;
  severity: FindingSeverity;
  severityWeight: number;
  riskReason: string;
  evidenceText: string;
  sourcePage?: number;
  sourceSection?: string;
  recommendedAction: string;
  suggestedOwner?: string;
  suggestedDeadline?: string;
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
  editedFields: string[];
  possibleDuplicateIds: string[];
  duplicateResolved: boolean;
  confidenceSignal: ConfidenceSignal;
  status: "Open" | "In Progress" | "Closed";
  createdAt: string;
  updatedAt: string;
}

export interface FindingSummary {
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  byReviewStatus: Record<string, number>;
  total: number;
}

interface FindingListResponse {
  findings: FindingRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// --- Queries ---

export function useFindings(
  auditId: string,
  params?: {
    severity?: FindingSeverity;
    category?: FindingCategory;
    reviewStatus?: ReviewStatus;
    status?: string;
    page?: number;
    limit?: number;
  },
) {
  return useQuery({
    queryKey: ["findings", auditId, params],
    queryFn: async () => {
      const { data } = await apiClient.get("/findings", {
        params: { auditId, ...params },
      });
      return {
        findings: data.data as FindingRecord[],
        ...data.pagination,
      } as FindingListResponse;
    },
    enabled: !!auditId,
  });
}

export function useFinding(findingId: string) {
  return useQuery({
    queryKey: ["findings", "detail", findingId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/findings/${findingId}`);
      return data.data as FindingRecord;
    },
    enabled: !!findingId,
  });
}

export function useFindingSummary(auditId: string) {
  return useQuery({
    queryKey: ["findings", "summary", auditId],
    queryFn: async () => {
      const { data } = await apiClient.get("/findings/summary", {
        params: { auditId },
      });
      return data.data as FindingSummary;
    },
    enabled: !!auditId,
  });
}

// --- Mutations ---

export function useUpdateFinding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      findingId,
      auditId,
      ...input
    }: {
      findingId: string;
      auditId: string;
      title?: string;
      description?: string;
      category?: FindingCategory;
      severity?: FindingSeverity;
      riskReason?: string;
      recommendedAction?: string;
      suggestedOwner?: string;
      suggestedDeadline?: string;
      reviewStatus?: ReviewStatus;
      reviewerNotes?: string;
      status?: "Open" | "In Progress" | "Closed";
    }) => {
      const { data } = await apiClient.patch(`/findings/${findingId}`, input);
      return data.data as FindingRecord;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["findings", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["findings", "detail", variables.findingId] });
      queryClient.invalidateQueries({ queryKey: ["findings", "summary", variables.auditId] });
    },
  });
}
