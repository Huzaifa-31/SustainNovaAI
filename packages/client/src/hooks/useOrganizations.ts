import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// --- Types ---

interface Organization {
  _id: string;
  name: string;
  description?: string;
  ownerUserId: string;
  memberIds: { _id: string; name: string; email: string; role: string }[] | string[];
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// --- Queries ---

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data } = await apiClient.get("/organizations");
      return data.data as Organization[];
    },
  });
}

export function useOrganization(orgId: string) {
  return useQuery({
    queryKey: ["organizations", orgId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${orgId}`);
      return data.data as Organization;
    },
    enabled: !!orgId,
  });
}

// --- Mutations ---

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data } = await apiClient.post("/organizations", input);
      return data.data as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, ...input }: { orgId: string; name?: string; description?: string }) => {
      const { data } = await apiClient.patch(`/organizations/${orgId}`, input);
      return data.data as Organization;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", variables.orgId] });
    },
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, email, role }: { orgId: string; email: string; role?: string }) => {
      const { data } = await apiClient.post(`/organizations/${orgId}/members`, { email, role });
      return data.data as Organization;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations", variables.orgId] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, memberId }: { orgId: string; memberId: string }) => {
      const { data } = await apiClient.delete(`/organizations/${orgId}/members/${memberId}`);
      return data.data as Organization;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations", variables.orgId] });
    },
  });
}
