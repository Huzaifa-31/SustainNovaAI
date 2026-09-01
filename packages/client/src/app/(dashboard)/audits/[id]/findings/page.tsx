"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import {
  useFindings,
  useFindingSummary,
  useUpdateFinding,
  FindingRecord,
  FindingSeverity,
  FindingCategory,
  ReviewStatus,
} from "@/hooks/useFindings";

// --- Helpers ---

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "bg-red-600 text-white",
  High: "bg-orange-500 text-white",
  Medium: "bg-yellow-500 text-white",
  Low: "bg-blue-500 text-white",
};

const REVIEW_BADGE: Record<string, string> = {
  ai_generated: "bg-purple-100 text-purple-700",
  needs_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const CONFIDENCE_ICON: Record<string, string> = {
  strong_evidence: "✅",
  limited_evidence: "⚠️",
  needs_review: "🔍",
  evidence_not_found: "❌",
};

const STATUS_BADGE: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  "In Progress": "bg-yellow-100 text-yellow-700",
  Closed: "bg-green-100 text-green-700",
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

// --- Summary Bar ---

function SummaryBar({ auditId }: { auditId: string }) {
  const { data, isLoading } = useFindingSummary(auditId);

  if (isLoading || !data) {
    return (
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  const sev = data.bySeverity;
  return (
    <div className="mb-6 grid grid-cols-4 gap-3">
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
        <p className="text-2xl font-bold text-red-600">{sev.Critical ?? 0}</p>
        <p className="text-xs text-red-500">Critical</p>
      </div>
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-center">
        <p className="text-2xl font-bold text-orange-600">{sev.High ?? 0}</p>
        <p className="text-xs text-orange-500">High</p>
      </div>
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-center">
        <p className="text-2xl font-bold text-yellow-600">{sev.Medium ?? 0}</p>
        <p className="text-xs text-yellow-500">Medium</p>
      </div>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
        <p className="text-2xl font-bold text-blue-600">{sev.Low ?? 0}</p>
        <p className="text-xs text-blue-500">Low</p>
      </div>
    </div>
  );
}

// --- Finding Card ---

function FindingCard({
  finding,
  auditId,
}: {
  finding: FindingRecord;
  auditId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const updateFinding = useUpdateFinding();

  const handleReview = (reviewStatus: ReviewStatus) => {
    updateFinding.mutate({
      findingId: finding._id,
      auditId,
      reviewStatus,
    });
  };

  const handleStatusChange = (status: "Open" | "In Progress" | "Closed") => {
    updateFinding.mutate({
      findingId: finding._id,
      auditId,
      status,
    });
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
                className={`rounded px-2 py-0.5 text-xs font-semibold ${SEVERITY_COLORS[finding.severity]}`}
              >
                {finding.severity}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${REVIEW_BADGE[finding.reviewStatus]}`}
              >
                {finding.reviewStatus.replace("_", " ")}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[finding.status]}`}
              >
                {finding.status}
              </span>
              <span className="text-xs text-gray-400">
                {CONFIDENCE_ICON[finding.confidenceSignal]}{" "}
                {finding.confidenceSignal.replace(/_/g, " ")}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-gray-900">
              {finding.title}
            </h4>
          </div>
          <span className="text-xs text-gray-400">
            {expanded ? "▲" : "▼"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="rounded bg-gray-100 px-2 py-0.5">
            {finding.category}
          </span>
          {finding.sourcePage && (
            <span className="rounded bg-gray-100 px-2 py-0.5">
              Page {finding.sourcePage}
            </span>
          )}
          {finding.editedFields.length > 0 && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">
              Edited
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
                Description
              </h5>
              <p className="text-sm text-gray-700">{finding.description}</p>
            </div>

            <div>
              <h5 className="mb-1 text-xs font-semibold uppercase text-gray-500">
                Risk Reason
              </h5>
              <p className="text-sm text-gray-700">{finding.riskReason}</p>
            </div>

            <div>
              <h5 className="mb-1 text-xs font-semibold uppercase text-gray-500">
                Evidence
              </h5>
              <blockquote className="border-l-4 border-gray-300 pl-3 text-sm italic text-gray-600">
                &ldquo;{finding.evidenceText}&rdquo;
              </blockquote>
              {finding.sourceSection && (
                <p className="mt-1 text-xs text-gray-400">
                  Section: {finding.sourceSection}
                </p>
              )}
            </div>

            <div>
              <h5 className="mb-1 text-xs font-semibold uppercase text-gray-500">
                Recommended Action
              </h5>
              <p className="text-sm text-gray-700">
                {finding.recommendedAction}
              </p>
              {finding.suggestedOwner && (
                <p className="mt-1 text-xs text-gray-500">
                  Owner: {finding.suggestedOwner}
                  {finding.suggestedDeadline &&
                    ` — Deadline: ${finding.suggestedDeadline}`}
                </p>
              )}
            </div>

            {finding.reviewerNotes && (
              <div>
                <h5 className="mb-1 text-xs font-semibold uppercase text-gray-500">
                  Reviewer Notes
                </h5>
                <p className="text-sm text-gray-700">
                  {finding.reviewerNotes}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
            {finding.reviewStatus !== "approved" && (
              <button
                onClick={() => handleReview("approved")}
                disabled={updateFinding.isPending}
                className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                ✓ Approve
              </button>
            )}
            {finding.reviewStatus !== "rejected" && (
              <button
                onClick={() => handleReview("rejected")}
                disabled={updateFinding.isPending}
                className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                ✗ Reject
              </button>
            )}
            {finding.reviewStatus !== "needs_review" && (
              <button
                onClick={() => handleReview("needs_review")}
                disabled={updateFinding.isPending}
                className="rounded bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
              >
                Flag for Review
              </button>
            )}
            <select
              value={finding.status}
              onChange={(e) =>
                handleStatusChange(
                  e.target.value as "Open" | "In Progress" | "Closed",
                )
              }
              className="rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-700"
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export default function FindingsPage() {
  const params = useParams();
  const auditId = params.id as string;

  const [severity, setSeverity] = useState<FindingSeverity | "">("");
  const [category, setCategory] = useState<FindingCategory | "">("");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | "">("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useFindings(auditId, {
    severity: severity || undefined,
    category: category || undefined,
    reviewStatus: reviewStatus || undefined,
    status: status || undefined,
    page,
    limit: 20,
  });

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">Findings</h3>

      {/* Summary */}
      <SummaryBar auditId={auditId} />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Severity
          </label>
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value as FindingSeverity | "");
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

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as FindingCategory | "");
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Review
          </label>
          <select
            value={reviewStatus}
            onChange={(e) => {
              setReviewStatus(e.target.value as ReviewStatus | "");
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="ai_generated">AI Generated</option>
            <option value="needs_review">Needs Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {(severity || category || reviewStatus || status) && (
          <button
            onClick={() => {
              setSeverity("");
              setCategory("");
              setReviewStatus("");
              setStatus("");
              setPage(1);
            }}
            className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Findings List */}
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
          Failed to load findings:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      {data && data.findings.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">
            No findings yet. Upload and process a document to generate AI
            findings.
          </p>
        </div>
      )}

      {data && data.findings.length > 0 && (
        <>
          <p className="mb-3 text-xs text-gray-500">
            {data.total} finding{data.total !== 1 ? "s" : ""} — Page {data.page}{" "}
            of {data.totalPages}
          </p>
          <div className="space-y-3">
            {data.findings.map((finding) => (
              <FindingCard
                key={finding._id}
                finding={finding}
                auditId={auditId}
              />
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
