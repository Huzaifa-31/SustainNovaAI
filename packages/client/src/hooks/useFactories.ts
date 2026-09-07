import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface Factory {
  _id: string;
  organizationId: string;
  createdBy: string;
  name: string;
  description?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export function useFactories(organizationId?: string) {
  return useQuery({
    queryKey: ["factories", organizationId],
    queryFn: async () => {
      const { data } = await apiClient.get("/factories", {
        params: organizationId ? { organizationId } : undefined,
      });
      return data.data as Factory[];
    },
  });
}

export function useFactory(factoryId: string) {
  return useQuery({
    queryKey: ["factories", factoryId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/factories/${factoryId}`);
      return data.data as Factory;
    },
    enabled: !!factoryId,
  });
}

export function useCreateFactory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      organizationId: string;
      name: string;
      description?: string;
      location?: string;
    }) => {
      const { data } = await apiClient.post("/factories", input);
      return data.data as Factory;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["factories", variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateFactory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      factoryId,
      ...input
    }: {
      factoryId: string;
      name?: string;
      description?: string;
      location?: string;
    }) => {
      const { data } = await apiClient.patch(`/factories/${factoryId}`, input);
      return data.data as Factory;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["factories", data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["factories", data._id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteFactory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      factoryId,
      organizationId,
    }: {
      factoryId: string;
      organizationId: string;
    }) => {
      const { data } = await apiClient.delete(`/factories/${factoryId}`);
      return data.data as { deleted: boolean };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["factories", variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
