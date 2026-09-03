import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type NotificationType =
  | "critical_finding"
  | "cap_assigned"
  | "cap_due_soon"
  | "cap_overdue"
  | "cap_approval_needed"
  | "cap_completed"
  | "processing_completed"
  | "processing_failed";

export interface Notification {
  _id: string;
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityId?: string;
  entityType?: "finding" | "cap" | "document" | "audit";
  read: boolean;
  createdAt: string;
}

interface NotificationListResponse {
  data: Notification[];
  meta: {
    unreadCount: number;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const NOTIFICATIONS_KEY = "notifications";
const UNREAD_COUNT_KEY = "notifications-unread-count";

// --- Queries ---

export function useNotifications(unreadOnly = false, page = 1, limit = 20) {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, { unreadOnly, page, limit }],
    queryFn: async () => {
      const { data } = await apiClient.get("/notifications", {
        params: { unreadOnly, page, limit },
      });
      return data as NotificationListResponse;
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [UNREAD_COUNT_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get("/notifications/unread-count");
      return data.data.count as number;
    },
    refetchInterval: 30_000, // poll every 30s
  });
}

// --- Mutations ---

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await apiClient.patch(`/notifications/${notificationId}/read`);
      return data.data as Notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/notifications/read-all");
      return data.data as { updated: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.delete(`/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });
}
