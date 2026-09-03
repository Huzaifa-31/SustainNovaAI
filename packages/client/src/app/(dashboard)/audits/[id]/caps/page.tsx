"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import {
  useCAPs,
  useCAPSummary,
  useUpdateCAP,
  useApproveCAP,
  CAPRecord,
  CAPPriority,
  CAPStatus,
} from "@/hooks/useCAPs";

// --- Helpers ---

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "bg-red-600 text-white",
  High: "bg-orange-500 text-white",
  Medium: "bg-yellow-500 text-white",
  Low: "bg-blue-500 text-white",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  approved: "bg-green-100 text-green-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  evidence_submitted: "bg-purple-100 text-purple-700",
  review: "bg-orange-100 text-orange-700",
  closed: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  approved: "Approved",
  assigned: "Assigned",
  in_progress: "In Progress",
  evidence_submitted: "Evidence Submitted",
  review: "Under Review",
  closed: "Closed",
};

const STATUSES: CAPStatus[] = [
  "draft",
  "approved",
  "assigned",
  "in_progress",
  "evidence_submitted",
  "review",
  "closed",
];

// --- Summary Bar ---

function SummaryBar({ auditId }: { auditId: string }) {
  const { data, isLoading } = useCAPSummary(auditId);

  if (isLoading || !data) {
    return (
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6 grid grid-cols-4 gap-3">
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
        <p className="text-2xl font-bold text-red-600">{data.open}</p>
        <p className="text-xs text-red-500">Open</p>
      </div>
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-center">
        <p className="text-2xl font-bold text-yellow-600">{data.inProgress}</p>
        <p className="text-xs text-yellow-500">In Progress</p>
      </div>
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
        <p className="text-2xl font-bold text-green-600">{data.closed}</p>
        <p className="text-xs text-green-500">Closed</p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
        <p className="text-2xl font-bold text-gray-700">{data.total}</p>
        <p className="text-xs text-gray-500">Total CAPs</p>
      </div>
    </div>
  );
}

// --- CAP Card ---

function CAPCard({ cap, auditId }: { cap: CAPRecord; auditId: string }) {
  const [expanded, setExpanded] = useState(false);
  const updateCAP = useUpdateCAP();
  const approveCAP = useApproveCAP();

  const handleStatusChange = (status: CAPStatus) => {
    updateCAP.mutate({ capId: cap._id, auditId, status });
  };

  const handleApprove = (humanApproved: boolean) => {
    approveCAP.mutate({ capId: cap._id, auditId, humanApproved });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div
        className="cursor-pointer p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[cap.priority]}`}
              >
                {cap.priority}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[cap.status]}`}
              >
                {STATUS_LABELS[cap.status]}
              </span>
              {cap.humanApproved && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Approved
                </span>
              )}
              {cap.isOverdue && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Overdue
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-gray-900">
              {cap.correctiveAction.substring(0, 100)}
              {cap.correctiveAction.length > 100 ? "..." : ""}
            </h4>
          </div>
          <span className="text-xs text-gray-400">
            {expanded ? "▲" : "▼"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="rounded bg-gray-100 px-2 py-0.5">
            {cap.responsibleRole}
          </span>
          <span className="rounded bg-gray-100 px-2 py-0.5">
            {cap.suggestedTimeline}
          </span>
          {cap.dueDate && (
            <span className="rounded bg-gray-100 px-2 py-0.5">
              Due: {new Date(cap.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-100 p-4">
          <div className="mb-4 space-y-3">
            <div>
              <h5 className="mb-1 text-xs font-semibold uppercase text-gray-500">
                Root Cause
              </h5>
              <p className="text-sm text-gray-700">{cap.rootCause}</p>
            </div>

            <div>
              <h5 className="mb-1 text-xs font-semibold uppercase text-gray-500">
                Corrective Action
              </h5>
              <p className="text-sm text-gray-700">{cap.correctiveAction}</p>
            </div>

            <div>
              <h5 className="mb-1 text-xs font-semibold uppercase text-gray-500">
                Expected Outcome
              </h5>
              <p className="text-sm text-gray-700">{cap.expectedOutcome}</p>
            </div>

            {cap.progress && (
              <div>
                <h5 className="mb-1 text-xs font-semibold uppercase text-gray-500">
                  Progress Notes
                </h5>
                <p className="text-sm text-gray-700">{cap.progress}</p>
              </div>
            )}

            {cap.completionEvidence && (
              <div>
                <h5 className="mb-1 text-xs font-semibold uppercase text-gray-500">
                  Completion Evidence
                </h5>
                <p className="text-sm text-gray-700">{cap.completionEvidence}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            {!cap.humanApproved && cap.status !== "closed" && (
              <button
                onClick={() => handleApprove(true)}
                disabled={approveCAP.isPending}
                className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                ✓ Approve CAP
              </button>
            )}
            {cap.humanApproved && cap.status !== "closed" && (
              <button
                onClick={() => handleApprove(false)}
                disabled={approveCAP.isPending}
                className="rounded bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                Unapprove
              </button>
            )}
            <select
              value={cap.status}
              onChange={(e) => handleStatusChange(e.target.value as CAPStatus)}
              disabled={updateCAP.isPending}
              className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-700 disabled:opacity-50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export default function CAPsPage() {
  const params = useParams();
  const auditId = params.id as string;

  const [status, setStatus] = useState<CAPStatus | "">("");
  const [priority, setPriority] = useState<CAPPriority | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useCAPs(auditId, {
    status: status || undefined,
    priority: priority || undefined,
    page,
    limit: 20,
  });

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Corrective Action Plans (CAPs)
      </h3>

      {/* Summary */}
      <SummaryBar auditId={auditId} />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as CAPStatus | "");
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as CAPPriority | "");
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {(status || priority) && (
          <button
            onClick={() => {
              setStatus("");
              setPriority("");
              setPage(1);
            }}
            className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* CAPs List */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load CAPs:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      {data && data.caps.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">
            No CAPs yet. Upload and process a document to generate corrective
            action plans.
          </p>
        </div>
      )}

      {data && data.caps.length > 0 && (
        <>
          <p className="mb-3 text-xs text-gray-500">
            {data.total} CAP{data.total !== 1 ? "s" : ""} — Page {data.page}{" "}
            of {data.totalPages}
          </p>
          <div className="space-y-3">
            {data.caps.map((cap) => (
              <CAPCard key={cap._id} cap={cap} auditId={auditId} />
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
