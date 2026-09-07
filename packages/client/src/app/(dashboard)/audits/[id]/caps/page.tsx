"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Search, MoreHorizontal, X, CheckCircle2, Circle, Clock, AlertTriangle, List } from "lucide-react";
import {
  useCAPs,
  useCAPSummary,
  useUpdateCAP,
  useApproveCAP,
  CAPRecord,
  CAPPriority,
  CAPStatus,
} from "@/hooks/useCAPs";

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Low: "bg-blue-100 text-blue-700 border-blue-200",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  assigned: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-yellow-100 text-yellow-700 border-yellow-200",
  evidence_submitted: "bg-purple-100 text-purple-700 border-purple-200",
  review: "bg-orange-100 text-orange-700 border-orange-200",
  closed: "bg-green-100 text-green-700 border-green-200",
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

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50];

function PriorityBadge({ priority }: { priority: CAPPriority }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${PRIORITY_COLORS[priority]}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: CAPStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function SummaryCards({ auditId }: { auditId: string }) {
  const { data, isLoading } = useCAPSummary(auditId);

  if (isLoading || !data) {
    return (
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  const items = [
    { label: "Open", value: data.open, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
    { label: "In Progress", value: data.inProgress, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100" },
    { label: "Closed", value: data.closed, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
    { label: "Total CAPs", value: data.total, icon: List, color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-100" },
  ];

  return (
    <div className="mb-6 grid grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className={`flex items-center gap-3 rounded-xl border ${item.border} ${item.bg} p-4`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
            <item.icon className={`h-5 w-5 ${item.color}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CAPDetailModal({
  cap,
  auditId,
  onClose,
}: {
  cap: CAPRecord;
  auditId: string;
  onClose: () => void;
}) {
  const updateCAP = useUpdateCAP();
  const approveCAP = useApproveCAP();

  const handleStatusChange = (status: CAPStatus) => {
    updateCAP.mutate({ capId: cap._id, auditId, status });
  };

  const handleApprove = (humanApproved: boolean) => {
    approveCAP.mutate({ capId: cap._id, auditId, humanApproved });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={cap.priority} />
              <StatusBadge status={cap.status} />
              {cap.humanApproved && (
                <span className="rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                  Approved
                </span>
              )}
              {cap.isOverdue && (
                <span className="rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                  Overdue
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Corrective Action Plan</h3>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs font-medium text-gray-500">Responsible Role</span>
              <p className="font-medium text-gray-900">{cap.responsibleRole ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Timeline</span>
              <p className="font-medium text-gray-900">{cap.suggestedTimeline ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Due Date</span>
              <p className="font-medium text-gray-900">{cap.dueDate ? new Date(cap.dueDate).toLocaleDateString() : "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Assigned To</span>
              <p className="font-medium text-gray-900">{cap.assignedTo ?? "—"}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Root Cause</h4>
            <p className="text-sm text-gray-700">{cap.rootCause}</p>
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Corrective Action</h4>
            <p className="text-sm text-gray-700">{cap.correctiveAction}</p>
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Expected Outcome</h4>
            <p className="text-sm text-gray-700">{cap.expectedOutcome}</p>
          </div>

          {cap.progress && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Progress Notes</h4>
              <p className="text-sm text-gray-700">{cap.progress}</p>
            </div>
          )}

          {cap.completionEvidence && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Completion Evidence</h4>
              <p className="text-sm text-gray-700">{cap.completionEvidence}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 p-5">
          <div className="flex flex-wrap gap-2">
            {!cap.humanApproved && cap.status !== "closed" && (
              <button
                onClick={() => handleApprove(true)}
                disabled={approveCAP.isPending}
                className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Approve CAP
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
          </div>
          <select
            value={cap.status}
            onChange={(e) => handleStatusChange(e.target.value as CAPStatus)}
            disabled={updateCAP.isPending}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function CAPsPage() {
  const params = useParams();
  const auditId = params.id as string;

  const [status, setStatus] = useState<CAPStatus | "">("");
  const [priority, setPriority] = useState<CAPPriority | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedCAP, setSelectedCAP] = useState<CAPRecord | null>(null);

  const { data, isLoading, isError, error } = useCAPs(auditId, {
    status: status || undefined,
    priority: priority || undefined,
    page,
    limit,
  });

  const hasFilters = status || priority;

  const clearFilters = () => {
    setStatus("");
    setPriority("");
    setSearch("");
    setPage(1);
  };

  const caps = data?.caps ?? [];

  const filteredCaps = useMemo(() => {
    if (!search.trim()) return caps;
    const q = search.toLowerCase();
    return caps.filter((c) =>
      c.correctiveAction.toLowerCase().includes(q) ||
      c.rootCause.toLowerCase().includes(q) ||
      c.responsibleRole.toLowerCase().includes(q) ||
      c.priority.toLowerCase().includes(q)
    );
  }, [caps, search]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Corrective Action Plans (CAPs)</h3>
        <p className="text-sm text-gray-500">Track and manage corrective action plans</p>
      </div>

      {/* Summary Cards */}
      <SummaryCards auditId={auditId} />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search CAPs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as CAPStatus | ""); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value as CAPPriority | ""); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Priority</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Clear filters
            </button>
          )}
          <button className="rounded-md border border-gray-300 p-2 text-gray-500 hover:bg-gray-50">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {isLoading ? (
          "Loading CAPs..."
        ) : (
          <>
            {data?.total ?? 0} CAP{data?.total !== 1 ? "s" : ""} — Page {page} of {data?.totalPages ?? 1}
          </>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-600">#</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Corrective Action</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Priority</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Responsible Role</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Timeline</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Due Date</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Approved</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Loading CAPs...
                  </td>
                </tr>
              )}

              {isError && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-red-600">
                    Failed to load CAPs: {error instanceof Error ? error.message : "Unknown error"}
                  </td>
                </tr>
              )}

              {!isLoading && !isError && filteredCaps.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No CAPs found. Upload and analyze a document to generate corrective action plans.
                  </td>
                </tr>
              )}

              {!isLoading && !isError &&
                filteredCaps.map((cap, index) => (
                  <tr key={cap._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="max-w-xs truncate font-medium text-gray-900">{cap.correctiveAction}</p>
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={cap.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={cap.status} /></td>
                    <td className="px-4 py-3 text-gray-700">{cap.responsibleRole}</td>
                    <td className="px-4 py-3 text-gray-500">{cap.suggestedTimeline}</td>
                    <td className="px-4 py-3 text-gray-500">{cap.dueDate ? new Date(cap.dueDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      {cap.humanApproved ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                          <Circle className="h-3.5 w-3.5" /> No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedCAP(cap)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && !isError && (data?.totalPages ?? 1) > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data?.totalPages ?? 1, p + 1))}
              disabled={page >= (data?.totalPages ?? 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCAP && (
        <CAPDetailModal
          cap={selectedCAP}
          auditId={auditId}
          onClose={() => setSelectedCAP(null)}
        />
      )}
    </div>
  );
}
