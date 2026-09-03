import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// --- Types ---

export type CAPPriority = "Critical" | "High" | "Medium" | "Low";

export type CAPStatus =
  | "draft"
  | "approved"
  | "assigned"
  | "in_progress"
  | "evidence_submitted"
  | "review"
  | "closed";

export interface CAPRecord {
  _id: string;
  findingId: string;
  auditId: string;
  organizationId: string;
  rootCause: string;
  correctiveAction: string;
  expectedOutcome: string;
  priority: CAPPriority;
  responsibleRole: string;
  suggestedTimeline: string;
  status: CAPStatus;
  humanApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  assignedTo?: string;
  assignedAt?: string;
  dueDate?: string;
  progress?: string;
  comments: {
    userId: string;
    text: string;
    createdAt: string;
  }[];
  completionEvidence?: string;
  completionEvidencePath?: string;
  closedAt?: string;
  closedBy?: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CAPSummary {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  overdue: number;
}

interface CAPListResponse {
  caps: CAPRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// --- Queries ---

export function useCAPs(
  auditId: string,
  params?: {
    status?: CAPStatus;
    priority?: CAPPriority;
    page?: number;
    limit?: number;
  },
) {
  return useQuery({
    queryKey: ["caps", auditId, params],
    queryFn: async () => {
      const { data } = await apiClient.get("/caps", {
        params: { auditId, ...params },
      });
      return {
        caps: data.data as CAPRecord[],
        ...data.pagination,
      } as CAPListResponse;
    },
    enabled: !!auditId,
  });
}

export function useCAP(capId: string) {
  return useQuery({
    queryKey: ["caps", "detail", capId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/caps/${capId}`);
      return data.data as CAPRecord;
    },
    enabled: !!capId,
  });
}

export function useCAPSummary(auditId: string) {
  return useQuery({
    queryKey: ["caps", "summary", auditId],
    queryFn: async () => {
      const { data } = await apiClient.get("/caps/summary", {
        params: { auditId },
      });
      return data.data as CAPSummary;
    },
    enabled: !!auditId,
  });
}

// --- Mutations ---

export function useGenerateCAPs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ auditId }: { auditId: string }) => {
      const { data } = await apiClient.post("/caps/generate", { auditId });
      return data.data as { generated: number };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["caps", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["caps", "summary", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}

export function useUpdateCAP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      capId,
      auditId,
      ...input
    }: {
      capId: string;
      auditId: string;
      rootCause?: string;
      correctiveAction?: string;
      expectedOutcome?: string;
      priority?: CAPPriority;
      responsibleRole?: string;
      suggestedTimeline?: string;
      status?: CAPStatus;
      dueDate?: string;
      progress?: string;
      completionEvidence?: string;
    }) => {
      const { data } = await apiClient.patch(`/caps/${capId}`, input);
      return data.data as CAPRecord;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["caps", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["caps", "detail", variables.capId] });
      queryClient.invalidateQueries({ queryKey: ["caps", "summary", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}

export function useApproveCAP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      capId,
      auditId,
      humanApproved,
    }: {
      capId: string;
      auditId: string;
      humanApproved: boolean;
    }) => {
      const { data } = await apiClient.post(`/caps/${capId}/approve`, {
        humanApproved,
      });
      return data.data as CAPRecord;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["caps", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["caps", "detail", variables.capId] });
      queryClient.invalidateQueries({ queryKey: ["caps", "summary", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}

export function useAssignCAP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      capId,
      auditId,
      assignedTo,
    }: {
      capId: string;
      auditId: string;
      assignedTo: string;
    }) => {
      const { data } = await apiClient.post(`/caps/${capId}/assign`, {
        assignedTo,
      });
      return data.data as CAPRecord;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["caps", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["caps", "detail", variables.capId] });
      queryClient.invalidateQueries({ queryKey: ["caps", "summary", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}

export function useAddCAPComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      capId,
      auditId,
      text,
    }: {
      capId: string;
      auditId: string;
      text: string;
    }) => {
      const { data } = await apiClient.post(`/caps/${capId}/comments`, {
        text,
      });
      return data.data as CAPRecord;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["caps", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["caps", "detail", variables.capId] });
    },
  });
}

export function useDeleteCAP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ capId, auditId }: { capId: string; auditId: string }) => {
      await apiClient.delete(`/caps/${capId}`);
      return { capId, auditId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["caps", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["caps", "summary", variables.auditId] });
      queryClient.invalidateQueries({ queryKey: ["audits"] });
    },
  });
}
