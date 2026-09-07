"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Search, MoreHorizontal, X, AlertTriangle, ArrowUp, ArrowDown, Minus } from "lucide-react";
import {
  useFindings,
  useFindingSummary,
  useUpdateFinding,
  FindingRecord,
  FindingSeverity,
  FindingCategory,
  ReviewStatus,
} from "@/hooks/useFindings";

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Low: "bg-blue-100 text-blue-700 border-blue-200",
};

const REVIEW_BADGE: Record<string, string> = {
  ai_generated: "bg-purple-100 text-purple-700 border-purple-200",
  needs_review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_BADGE: Record<string, string> = {
  Open: "bg-red-100 text-red-700 border-red-200",
  "In Progress": "bg-yellow-100 text-yellow-700 border-yellow-200",
  Closed: "bg-green-100 text-green-700 border-green-200",
};

const CATEGORIES: FindingCategory[] = [
  "Labour & HR",
  "Safety",
  "Environment",
  "Governance",
  "Worker Wellbeing",
  "Grievance & Harassment",
  "Wages & Working Hours",
];

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50];

function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${SEVERITY_COLORS[severity]}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[status] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {status}
    </span>
  );
}

function ReviewBadge({ reviewStatus }: { reviewStatus: ReviewStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${REVIEW_BADGE[reviewStatus]}`}>
      {reviewStatus.replace("_", " ")}
    </span>
  );
}

function EvidenceIcon({ signal }: { signal: string }) {
  if (signal === "strong_evidence") {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><span className="h-2 w-2 rounded-full bg-green-500" />strong</span>;
  }
  if (signal === "limited_evidence") {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700"><span className="h-2 w-2 rounded-full bg-yellow-500" />limited</span>;
  }
  if (signal === "needs_review") {
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700"><span className="h-2 w-2 rounded-full bg-orange-500" />review</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700"><span className="h-2 w-2 rounded-full bg-red-500" />none</span>;
}

function SummaryCards({ auditId }: { auditId: string }) {
  const { data, isLoading } = useFindingSummary(auditId);

  if (isLoading || !data) {
    return (
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  const sev = data.bySeverity;
  const items = [
    { label: "Critical", value: sev.Critical ?? 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
    { label: "High", value: sev.High ?? 0, icon: ArrowUp, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
    { label: "Medium", value: sev.Medium ?? 0, icon: Minus, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100" },
    { label: "Low", value: sev.Low ?? 0, icon: ArrowDown, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
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

function FindingDetailModal({
  finding,
  auditId,
  onClose,
}: {
  finding: FindingRecord;
  auditId: string;
  onClose: () => void;
}) {
  const updateFinding = useUpdateFinding();

  const handleReview = (reviewStatus: ReviewStatus) => {
    updateFinding.mutate({ findingId: finding._id, auditId, reviewStatus });
  };

  const handleStatusChange = (status: "Open" | "In Progress" | "Closed") => {
    updateFinding.mutate({ findingId: finding._id, auditId, status });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <SeverityBadge severity={finding.severity} />
              <ReviewBadge reviewStatus={finding.reviewStatus} />
              <StatusBadge status={finding.status} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{finding.title}</h3>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs font-medium text-gray-500">Category</span>
              <p className="font-medium text-gray-900">{finding.category}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Source Page</span>
              <p className="font-medium text-gray-900">{finding.sourcePage ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Owner</span>
              <p className="font-medium text-gray-900">{finding.suggestedOwner ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Confidence</span>
              <p><EvidenceIcon signal={finding.confidenceSignal} /></p>
            </div>
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Description</h4>
            <p className="text-sm text-gray-700">{finding.description}</p>
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Risk Reason</h4>
            <p className="text-sm text-gray-700">{finding.riskReason}</p>
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Evidence</h4>
            <blockquote className="border-l-4 border-gray-300 pl-3 text-sm italic text-gray-600">
              &ldquo;{finding.evidenceText}&rdquo;
            </blockquote>
            {finding.sourceSection && (
              <p className="mt-1 text-xs text-gray-400">Section: {finding.sourceSection}</p>
            )}
          </div>

          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Recommended Action</h4>
            <p className="text-sm text-gray-700">{finding.recommendedAction}</p>
            {finding.suggestedDeadline && (
              <p className="mt-1 text-xs text-gray-500">Suggested deadline: {finding.suggestedDeadline}</p>
            )}
          </div>

          {finding.reviewerNotes && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">Reviewer Notes</h4>
              <p className="text-sm text-gray-700">{finding.reviewerNotes}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 p-5">
          <div className="flex flex-wrap gap-2">
            {finding.reviewStatus !== "approved" && (
              <button onClick={() => handleReview("approved")} disabled={updateFinding.isPending} className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                Approve
              </button>
            )}
            {finding.reviewStatus !== "rejected" && (
              <button onClick={() => handleReview("rejected")} disabled={updateFinding.isPending} className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                Reject
              </button>
            )}
            {finding.reviewStatus !== "needs_review" && (
              <button onClick={() => handleReview("needs_review")} disabled={updateFinding.isPending} className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-50">
                Flag for Review
              </button>
            )}
          </div>
          <select
            value={finding.status}
            onChange={(e) => handleStatusChange(e.target.value as "Open" | "In Progress" | "Closed")}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default function FindingsPage() {
  const params = useParams();
  const auditId = params.id as string;

  const [severity, setSeverity] = useState<FindingSeverity | "">("");
  const [category, setCategory] = useState<FindingCategory | "">("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | "">("");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedFinding, setSelectedFinding] = useState<FindingRecord | null>(null);

  const { data, isLoading, isError, error } = useFindings(auditId, {
    severity: severity || undefined,
    category: category || undefined,
    reviewStatus: reviewStatus || undefined,
    status: status || undefined,
    page,
    limit,
  });

  const hasFilters = severity || category || reviewStatus || status;

  const clearFilters = () => {
    setSeverity("");
    setCategory("");
    setReviewStatus("");
    setStatus("");
    setSearch("");
    setPage(1);
  };

  const findings = data?.findings ?? [];

  // Client-side search filter
  const filteredFindings = useMemo(() => {
    if (!search.trim()) return findings;
    const q = search.toLowerCase();
    return findings.filter((f) =>
      f.title.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      f.severity.toLowerCase().includes(q)
    );
  }, [findings, search]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Findings</h3>
        <p className="text-sm text-gray-500">Review and manage audit findings</p>
      </div>

      {/* Summary Cards */}
      <SummaryCards auditId={auditId} />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search findings..."
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
            value={severity}
            onChange={(e) => { setSeverity(e.target.value as FindingSeverity | ""); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Severity</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value as FindingCategory | ""); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={reviewStatus}
            onChange={(e) => { setReviewStatus(e.target.value as ReviewStatus | ""); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Review</option>
            <option value="ai_generated">AI Generated</option>
            <option value="needs_review">Needs Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
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
          "Loading findings..."
        ) : (
          <>
            {data?.total ?? 0} finding{data?.total !== 1 ? "s" : ""} — Page {page} of {data?.totalPages ?? 1}
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
                <th className="px-4 py-3 font-semibold text-gray-600">Finding</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Severity</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Category</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Page</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Evidence</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Owner</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Loading findings...
                  </td>
                </tr>
              )}

              {isError && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-red-600">
                    Failed to load findings: {error instanceof Error ? error.message : "Unknown error"}
                  </td>
                </tr>
              )}

              {!isLoading && !isError && filteredFindings.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No findings found. Upload and analyze a document to generate findings.
                  </td>
                </tr>
              )}

              {!isLoading && !isError &&
                filteredFindings.map((finding, index) => (
                  <tr key={finding._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="max-w-xs truncate font-medium text-gray-900">{finding.title}</p>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={finding.severity} /></td>
                    <td className="px-4 py-3 text-gray-700">{finding.category}</td>
                    <td className="px-4 py-3 text-gray-500">{finding.sourcePage ?? "—"}</td>
                    <td className="px-4 py-3"><EvidenceIcon signal={finding.confidenceSignal} /></td>
                    <td className="px-4 py-3"><StatusBadge status={finding.status} /></td>
                    <td className="px-4 py-3 text-gray-700">{finding.suggestedOwner ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedFinding(finding)}
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
      {selectedFinding && (
        <FindingDetailModal
          finding={selectedFinding}
          auditId={auditId}
          onClose={() => setSelectedFinding(null)}
        />
      )}
    </div>
  );
}
