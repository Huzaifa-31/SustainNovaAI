"use client";

import { useState } from "react";
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  type NotificationType,
} from "@/hooks/useNotifications";
import { Bell, Check, Trash2, FileText, AlertTriangle, ClipboardCheck } from "lucide-react";

const typeIcon: Record<NotificationType, React.ReactNode> = {
  critical_finding: <AlertTriangle className="h-5 w-5 text-red-600" />,
  cap_assigned: <ClipboardCheck className="h-5 w-5 text-blue-600" />,
  cap_due_soon: <Bell className="h-5 w-5 text-yellow-600" />,
  cap_overdue: <AlertTriangle className="h-5 w-5 text-red-600" />,
  cap_approval_needed: <ClipboardCheck className="h-5 w-5 text-purple-600" />,
  cap_completed: <Check className="h-5 w-5 text-green-600" />,
  processing_completed: <FileText className="h-5 w-5 text-green-600" />,
  processing_failed: <AlertTriangle className="h-5 w-5 text-red-600" />,
};

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(unreadOnly, page, 20);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-gray-500">
            {meta?.unreadCount ?? 0} unread
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded border-gray-300"
            />
            Unread only
          </label>
          <button
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending || (meta?.unreadCount ?? 0) === 0}
            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Mark all read
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`flex items-start gap-4 rounded-lg border bg-white p-4 shadow-sm ${
                notification.read ? "border-gray-200" : "border-indigo-200 bg-indigo-50"
              }`}
            >
              <div className="mt-0.5">{typeIcon[notification.type]}</div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  {notification.title}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {notification.message}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!notification.read && (
                  <button
                    onClick={() => markAsRead.mutate(notification._id)}
                    disabled={markAsRead.isPending}
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteNotification.mutate(notification._id)}
                  disabled={deleteNotification.isPending}
                  className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
