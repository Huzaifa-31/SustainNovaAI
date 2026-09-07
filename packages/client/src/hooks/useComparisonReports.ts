import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface ComparisonReport {
  currentAuditId: string;
  previousAuditId: string;
  currentAuditName: string;
  previousAuditName: string;
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

export function useComparisonReports(organizationId?: string) {
  return useQuery({
    queryKey: ["comparison-reports", organizationId],
    queryFn: async () => {
      const { data } = await apiClient.get("/audits/compare/reports", {
        params: organizationId ? { organizationId } : undefined,
      });
      return data.data as ComparisonReport[];
    },
  });
}
