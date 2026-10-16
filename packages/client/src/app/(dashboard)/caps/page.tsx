"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, Factory, Search, X, CheckCircle2, Circle } from "lucide-react";
import {
  useOrganizationCAPs,
  OrgCAPRecord,
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

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function CAPDetailModal({ cap, onClose }: { cap: OrgCAPRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className={PRIORITY_COLORS[cap.priority]}>{cap.priority}</Badge>
              <Badge className={STATUS_BADGE[cap.status]}>{STATUS_LABELS[cap.status]}</Badge>
              {cap.humanApproved && (
                <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>
              )}
              {cap.isOverdue && (
                <Badge className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Corrective Action Plan</h3>
            <p className="mt-1 text-xs text-gray-500">
              {cap.factoryName} &middot; {cap.auditName}
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5 text-sm">
          {cap.findingTitle && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Related Finding</h4>
              <p className="text-gray-700">{cap.findingTitle}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-medium text-gray-500">Responsible Role</span>
              <p className="font-medium text-gray-900">{cap.responsibleRole || "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Timeline</span>
              <p className="font-medium text-gray-900">{cap.suggestedTimeline || "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Due Date</span>
              <p className="font-medium text-gray-900">{formatDate(cap.dueDate)}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Assignment</span>
              <p className="font-medium text-gray-900">{cap.assignedTo ? "Assigned" : "Unassigned"}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Root Cause</h4>
            <p className="text-gray-700">{cap.rootCause}</p>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Corrective Action</h4>
            <p className="text-gray-700">{cap.correctiveAction}</p>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Expected Outcome</h4>
            <p className="text-gray-700">{cap.expectedOutcome}</p>
          </div>
          {cap.progress && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Progress Notes</h4>
              <p className="text-gray-700">{cap.progress}</p>
            </div>
          )}
          {cap.completionEvidence && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Completion Evidence</h4>
              <p className="text-gray-700">{cap.completionEvidence}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-white"
          >
            Close
          </button>
          <Link
            href={`/audits/${cap.auditId}/caps`}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Manage in audit
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CapsPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [factoryId, setFactoryId] = useState("");
  const [priority, setPriority] = useState<CAPPriority | "">("");
  const [status, setStatus] = useState<CAPStatus | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState<OrgCAPRecord | null>(null);

  // Debounce the search box so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, error } = useOrganizationCAPs({
    organizationId: organizationId || undefined,
    factoryId: factoryId || undefined,
    priority: priority || undefined,
    status: status || undefined,
    search: search || undefined,
    page,
    limit,
  });

  const caps = data?.caps ?? [];
  const factories = data?.factories ?? [];
  const organizations = data?.organizations;
  const totals = data?.totals;
  const totalPages = data?.totalPages ?? 1;

  const hasFilters = priority || status || searchInput || factoryId;

  const clearFilters = () => {
    setFactoryId("");
    setPriority("");
    setStatus("");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const selectFactory = (id: string) => {
    setFactoryId(id);
    setPage(1);
  };

  const organizationName = organizations
    ? organizations.find((o) => o._id === organizationId)?.name
    : factories[0]?.organizationName;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Corrective Actions</h1>
        <p className="flex items-center gap-1.5 text-sm text-gray-500">
          <Building2 className="h-4 w-4" />
          {organizationName ? `${organizationName} — ` : ""}corrective action plans across all factories
        </p>
      </div>

      {/* Factory cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => selectFactory("")}
          className={`rounded-xl border p-4 text-left transition ${
            factoryId === "" ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"
          }`}
        >
          <p className="text-sm font-medium text-gray-500">All factories</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totals?.total ?? 0}</p>
          <p className="text-xs text-gray-500">
            {totals?.open ?? 0} open &middot; {totals?.inProgress ?? 0} in progress &middot; {totals?.closed ?? 0} closed
            {totals && totals.overdue > 0 ? ` · ${totals.overdue} overdue` : ""}
          </p>
        </button>
        {factories.map((f) => (
          <button
            key={f._id}
            onClick={() => selectFactory(f._id)}
            className={`rounded-xl border p-4 text-left transition ${
              factoryId === f._id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-blue-600" />
              <p className="truncate text-sm font-semibold text-gray-900">{f.name}</p>
            </div>
            {organizations && <p className="truncate text-[11px] text-gray-400">{f.organizationName}</p>}
            <p className="mt-1 text-2xl font-bold text-gray-900">{f.total}</p>
            <p className="text-xs text-gray-500">
              {f.open} open &middot; {f.inProgress} in progress &middot; {f.closed} closed
              {f.overdue > 0 ? ` · ${f.overdue} overdue` : ""}
            </p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search corrective actions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {organizations && (
            <select
              value={organizationId}
              onChange={(e) => {
                setOrganizationId(e.target.value);
                setFactoryId("");
                setPage(1);
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All organizations</option>
              {organizations.map((o) => (
                <option key={o._id} value={o._id}>{o.name}</option>
              ))}
            </select>
          )}
          <select
            value={factoryId}
            onChange={(e) => selectFactory(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Factory</option>
            {factories.map((f) => (
              <option key={f._id} value={f._id}>{f.name}</option>
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
          {hasFilters && (
            <button onClick={clearFilters} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-500">
        {isLoading ? "Loading corrective actions..." : `${data?.total ?? 0} CAP${data?.total !== 1 ? "s" : ""} — Page ${page} of ${totalPages}`}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-600">#</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Corrective Action</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Factory</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Audit</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Priority</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Responsible</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Due Date</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Approved</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">Loading corrective actions...</td>
                </tr>
              )}

              {isError && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-red-600">
                    Failed to load corrective actions: {error instanceof Error ? error.message : "Unknown error"}
                  </td>
                </tr>
              )}

              {!isLoading && !isError && caps.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No corrective actions found. Generate CAPs from an audit&apos;s findings to see them here.
                  </td>
                </tr>
              )}

              {!isLoading && !isError &&
                caps.map((cap, index) => (
                  <tr key={cap._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="max-w-xs truncate font-medium text-gray-900">{cap.correctiveAction}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{cap.factoryName}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/audits/${cap.auditId}/caps`}
                        className="block max-w-[200px] truncate text-blue-600 hover:underline"
                      >
                        {cap.auditName}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><Badge className={PRIORITY_COLORS[cap.priority]}>{cap.priority}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[cap.status]}>{STATUS_LABELS[cap.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{cap.responsibleRole}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(cap.dueDate)}
                      {cap.isOverdue && <span className="ml-1 text-xs font-medium text-red-600">Overdue</span>}
                    </td>
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
                        onClick={() => setSelected(cap)}
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
      {!isLoading && !isError && totalPages > 1 && (
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
            <span className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selected && <CAPDetailModal cap={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
