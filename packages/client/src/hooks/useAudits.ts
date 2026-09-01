import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// --- Types ---

interface Audit {
  _id: string;
  organizationId: string;
  createdBy: string;
  name: string;
  description?: string;
  status: "active" | "completed" | "archived";
  auditPeriod?: { start: string; end: string };
  riskScore: number;
  findingCounts: { critical: number; high: number; medium: number; low: number; total: number };
  capStatus: { open: number; inProgress: number; closed: number; overdue: number };
  createdAt: string;
  updatedAt: string;
}

interface AuditListResponse {
  audits: Audit[];
  total: number;
  page: number;
  limit: number;
}

// --- Queries ---

export function useAudits() {
  return useQuery({
    queryKey: ["audits"],
    queryFn: async () => {
      const { data } = await apiClient.get("/audits");
      return data.data as Audit[];
    },
  });
}

export function useOrgAudits(orgId: string, params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["audits", "org", orgId, params],
    queryFn: async () => {
      const { data } = await apiClient.get(`/audits/org/${orgId}`, { params });
      return { audits: data.data as Audit[], ...data.meta } as AuditListResponse;
    },
    enabled: !!orgId,
  });
}

export function useAudit(auditId: string) {
  return useQuery({
    queryKey: ["audits", auditId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/audits/${auditId}`);
      return data.data as Audit;
    },
    enabled: !!auditId,
  });
}

// --- Mutations ---

export function useCreateAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      organizationId: string;
      name: string;
      description?: string;
      auditPeriod?: { start?: string; end?: string };
    }) => {
      const { data } = await apiClient.post("/audits", input);
      return data.data as Audit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}

export function useUpdateAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      auditId,
      ...input
    }: {
      auditId: string;
      name?: string;
      description?: string;
      status?: string;
    }) => {
      const { data } = await apiClient.patch(`/audits/${auditId}`, input);
      return data.data as Audit;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      queryClient.invalidateQueries({ queryKey: ["audits", variables.auditId] });
    },
  });
}

export function useDeleteAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (auditId: string) => {
      const { data } = await apiClient.delete(`/audits/${auditId}`);
      return data.data as Audit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}
