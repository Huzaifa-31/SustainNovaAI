"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { ClipboardList, User, FileText, CheckSquare, Download, Shield } from "lucide-react";

const actionIcon: Record<string, React.ReactNode> = {
  "document.uploaded": <FileText className="h-4 w-4 text-blue-600" />,
  "finding.updated": <CheckSquare className="h-4 w-4 text-yellow-600" />,
  "finding.approved": <CheckSquare className="h-4 w-4 text-green-600" />,
  "finding.rejected": <CheckSquare className="h-4 w-4 text-red-600" />,
  "finding.ai_generated": <CheckSquare className="h-4 w-4 text-gray-600" />,
  "cap.updated": <ClipboardList className="h-4 w-4 text-yellow-600" />,
  "cap.approved": <ClipboardList className="h-4 w-4 text-green-600" />,
  "cap.rejected": <ClipboardList className="h-4 w-4 text-red-600" />,
  "cap.assigned": <ClipboardList className="h-4 w-4 text-purple-600" />,
  "cap.deleted": <ClipboardList className="h-4 w-4 text-red-600" />,
  "export.findings": <Download className="h-4 w-4 text-indigo-600" />,
  "export.caps": <Download className="h-4 w-4 text-indigo-600" />,
  "export.report": <Download className="h-4 w-4 text-indigo-600" />,
};

function getActionIcon(action: string) {
  return actionIcon[action] || <Shield className="h-4 w-4 text-gray-600" />;
}

function formatAction(action: string): string {
  return action
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AuditLogsPage() {
  const { id: auditId } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs(auditId, page, 20);

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Audit Trail</h2>

      {isLoading ? (
        <p className="text-gray-500">Loading audit trail...</p>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No audit log entries yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log._id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getActionIcon(log.action)}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatAction(log.action)}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      {log.userId?.name || "Unknown user"}
                    </p>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <pre className="mt-2 max-w-md rounded bg-gray-50 p-2 text-xs text-gray-600">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
                <span className="whitespace-nowrap text-xs text-gray-400">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
