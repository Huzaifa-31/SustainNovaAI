"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useAuditComparison } from "@/hooks/useAuditComparison";
import { useAudits } from "@/hooks/useAudits";
import { AlertCircle, Plus, CheckCircle, RefreshCw } from "lucide-react";

export default function ComparePage() {
  const { id: auditId } = useParams<{ id: string }>();
  const [previousAuditId, setPreviousAuditId] = useState<string>("");
  const { data: comparison, isLoading, error } = useAuditComparison(
    auditId,
    previousAuditId || undefined,
  );
  const { data: audits } = useAudits();

  const otherAudits =
    audits?.filter((a) => a._id !== auditId) ?? [];

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Audit Comparison</h2>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Compare with previous audit
        </label>
        <select
          value={previousAuditId}
          onChange={(e) => setPreviousAuditId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:w-80"
        >
          <option value="">
            {comparison?.previousAuditId
              ? `Linked: ${comparison.previousAuditName}`
              : "Select a previous audit or use linked audit"}
          </option>
          {otherAudits.map((audit) => (
            <option key={audit._id} value={audit._id}>
              {audit.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Comparing audits...</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error instanceof Error ? error.message : "Failed to compare audits"}
          </div>
        </div>
      ) : !comparison ? (
        <p className="text-gray-500">
          Select a previous audit to see the comparison.
        </p>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-4">
            <SummaryCard
              label="Current Findings"
              value={comparison.summary.currentTotal}
            />
            <SummaryCard
              label="Previous Findings"
              value={comparison.summary.previousTotal}
            />
            <SummaryCard
              label="New"
              value={comparison.summary.newCount}
              color="text-green-600"
            />
            <SummaryCard
              label="Resolved"
              value={comparison.summary.resolvedCount}
              color="text-blue-600"
            />
            <SummaryCard
              label="Recurring"
              value={comparison.summary.recurringCount}
              color="text-orange-600"
            />
          </div>

          {/* New Findings */}
          <FindingSection
            icon={<Plus className="h-5 w-5 text-green-600" />}
            title="New Findings"
            count={comparison.newFindings.length}
            findings={comparison.newFindings}
          />

          {/* Resolved Findings */}
          <FindingSection
            icon={<CheckCircle className="h-5 w-5 text-blue-600" />}
            title="Resolved Findings"
            count={comparison.resolvedFindings.length}
            findings={comparison.resolvedFindings}
          />

          {/* Recurring Findings */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-600" />
              <h3 className="font-medium text-gray-900">
                Recurring Findings ({comparison.recurringFindings.length})
              </h3>
            </div>
            {comparison.recurringFindings.length === 0 ? (
              <p className="text-sm text-gray-500">No recurring findings.</p>
            ) : (
              <div className="space-y-3">
                {comparison.recurringFindings.map((item) => (
                  <div
                    key={item.current._id}
                    className="rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {item.current.title}
                      </h4>
                      <span className="text-xs font-medium text-orange-600">
                        {Math.round(item.similarity * 100)}% match
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {item.current.description}
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      Severity: {item.current.severity} · Category:{" "}
                      {item.current.category}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = "text-gray-900",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function FindingSection({
  icon,
  title,
  count,
  findings,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  findings: { _id: string; title: string; description: string; severity: string; category: string }[];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="font-medium text-gray-900">
          {title} ({count})
        </h3>
      </div>
      {findings.length === 0 ? (
        <p className="text-sm text-gray-500">No {title.toLowerCase()}.</p>
      ) : (
        <div className="space-y-3">
          {findings.map((finding) => (
            <div
              key={finding._id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <h4 className="font-medium text-gray-900">{finding.title}</h4>
              <p className="mt-1 text-sm text-gray-600">
                {finding.description}
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Severity: {finding.severity} · Category: {finding.category}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
