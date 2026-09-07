import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface ComparisonFinding {
  _id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  status: string;
  similarity?: number;
}

export interface RecurringFinding {
  current: ComparisonFinding;
  previous: ComparisonFinding;
  similarity: number;
  trend: "improved" | "unchanged" | "worsened";
}

export interface AuditComparisonResult {
  currentAuditId: string;
  previousAuditId: string;
  currentAuditName: string;
  previousAuditName: string;
  newFindings: ComparisonFinding[];
  resolvedFindings: ComparisonFinding[];
  improvedFindings: RecurringFinding[];
  unchangedFindings: RecurringFinding[];
  worsenedFindings: RecurringFinding[];
  recurringFindings: RecurringFinding[];
  summary: {
    currentTotal: number;
    previousTotal: number;
    newCount: number;
    resolvedCount: number;
    improvedCount: number;
    unchangedCount: number;
    worsenedCount: number;
    recurringCount: number;
  };
}

export function useAuditComparison(
  auditId: string,
  previousAuditId?: string,
) {
  return useQuery({
    queryKey: ["audit-comparison", auditId, previousAuditId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/audits/${auditId}/compare`, {
        params: previousAuditId ? { previousAuditId } : undefined,
      });
      return data.data as AuditComparisonResult;
    },
    enabled: !!auditId,
  });
}
