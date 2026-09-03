import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface AuditLog {
  _id: string;
  organizationId: string;
  auditId?: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

interface AuditLogListResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useAuditLogs(auditId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["audit-logs", auditId, page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get(`/audits/${auditId}/logs`, {
        params: { page, limit },
      });
      return data as AuditLogListResponse;
    },
    enabled: !!auditId,
  });
}
