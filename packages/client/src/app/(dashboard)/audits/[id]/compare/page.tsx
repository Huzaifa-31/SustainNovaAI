"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  CheckCircle2,
  RefreshCw,
  GitCompare,
  ArrowRight,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useAuditComparison, ComparisonFinding, RecurringFinding } from "@/hooks/useAuditComparison";
import { useAudits } from "@/hooks/useAudits";

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Low: "bg-blue-100 text-blue-700 border-blue-200",
};

const TREND_COLORS: Record<string, string> = {
  improved: "text-green-600 bg-green-50 border-green-100",
  unchanged: "text-gray-600 bg-gray-50 border-gray-100",
  worsened: "text-red-600 bg-red-50 border-red-100",
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[severity] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {severity}
    </span>
  );
}

function TrendBadge({ trend }: { trend: RecurringFinding["trend"] }) {
  const labels = { improved: "Improved", unchanged: "Unchanged", worsened: "Worsened" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TREND_COLORS[trend]}`}>
      {trend === "improved" && <TrendingUp className="h-3 w-3" />}
      {trend === "worsened" && <TrendingDown className="h-3 w-3" />}
      {trend === "unchanged" && <Minus className="h-3 w-3" />}
      {labels[trend]}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-xl border ${bg} p-4`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  color,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  color: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="rounded-lg bg-white p-1.5 shadow-sm">
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <h3 className="text-base font-semibold text-gray-900">
        {title} <span className="text-sm font-normal text-gray-500">({count})</span>
      </h3>
    </div>
  );
}

function FindingTable({ findings }: { findings: ComparisonFinding[] }) {
  if (findings.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-600">Finding</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Severity</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Category</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {findings.map((finding) => (
              <tr key={finding._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="max-w-sm truncate font-medium text-gray-900">{finding.title}</p>
                  <p className="max-w-sm truncate text-xs text-gray-500">{finding.description}</p>
                </td>
                <td className="px-4 py-3"><SeverityBadge severity={finding.severity} /></td>
                <td className="px-4 py-3 text-gray-700">{finding.category}</td>
                <td className="px-4 py-3 text-gray-700">{finding.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecurringTable({ items, showTrend = true }: { items: RecurringFinding[]; showTrend?: boolean }) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-600">Current Finding</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Previous Finding</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Severity</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Category</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Match</th>
              {showTrend && <th className="px-4 py-3 font-semibold text-gray-600">Trend</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.current._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="max-w-xs truncate font-medium text-gray-900">{item.current.title}</p>
                  <p className="max-w-xs truncate text-xs text-gray-500">{item.current.description}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="max-w-xs truncate text-sm text-gray-700">{item.previous.title}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <SeverityBadge severity={item.previous.severity} />
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <SeverityBadge severity={item.current.severity} />
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{item.current.category}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold text-blue-600">
                    {Math.round(item.similarity * 100)}%
                  </span>
                </td>
                {showTrend && (
                  <td className="px-4 py-3">
                    <TrendBadge trend={item.trend} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
      {message}
    </div>
  );
}

export default function ComparePage() {
  const { id: auditId } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const organizationId = isAdmin ? undefined : session?.user?.organizationId;
  const [previousAuditId, setPreviousAuditId] = useState<string>("");
  const { data: comparison, isLoading, error } = useAuditComparison(
    auditId,
    previousAuditId || undefined,
  );
  const { data: audits } = useAudits(organizationId);

  const otherAudits = audits?.filter((a) => a._id !== auditId) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Audit Comparison</h2>
        <p className="text-sm text-gray-500">Compare findings across audits</p>
      </div>

      {/* Audit Selector */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <GitCompare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Compare with previous audit</p>
              {comparison?.previousAuditName && (
                <p className="text-xs text-gray-500">
                  Currently comparing with <span className="font-medium text-gray-700">{comparison.previousAuditName}</span>
                </p>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={previousAuditId}
              onChange={(e) => setPreviousAuditId(e.target.value)}
              className="w-full appearance-none rounded-md border border-gray-300 bg-white py-2 pl-9 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 lg:w-80"
            >
              <option value="">
                {comparison?.previousAuditId
                  ? `Linked: ${comparison.previousAuditName}`
                  : "Select a previous audit"}
              </option>
              {otherAudits.map((audit) => (
                <option key={audit._id} value={audit._id}>
                  {audit.name}
                </option>
              ))}
            </select>
            {previousAuditId && (
              <button
                onClick={() => setPreviousAuditId("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12 text-sm text-gray-500 shadow-sm">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Comparing audits...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm">
          <div className="mb-3 flex justify-center">
            <GitCompare className="h-10 w-10 text-gray-300" />
          </div>
          <p className="font-medium text-gray-900">No previous audit linked</p>
          <p className="mt-1">Select a previous audit above to see the comparison.</p>
        </div>
      ) : !comparison ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm">
          Select a previous audit to see the comparison.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Comparison Header */}
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-5 text-center sm:flex-row sm:gap-4">
            <span className="text-base font-semibold text-gray-900">{comparison.currentAuditName}</span>
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-600 shadow-sm">
              <ArrowRight className="h-3.5 w-3.5" />
              vs
            </div>
            <span className="text-base font-semibold text-gray-900">{comparison.previousAuditName}</span>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              label="Current Findings"
              value={comparison.summary.currentTotal}
              icon={GitCompare}
              color="text-gray-700"
              bg="bg-gray-50 border-gray-100"
            />
            <SummaryCard
              label="Previous Findings"
              value={comparison.summary.previousTotal}
              icon={GitCompare}
              color="text-gray-700"
              bg="bg-gray-50 border-gray-100"
            />
            <SummaryCard
              label="New"
              value={comparison.summary.newCount}
              icon={Plus}
              color="text-green-600"
              bg="bg-green-50 border-green-100"
            />
            <SummaryCard
              label="Improved"
              value={comparison.summary.improvedCount}
              icon={TrendingUp}
              color="text-blue-600"
              bg="bg-blue-50 border-blue-100"
            />
            <SummaryCard
              label="Unchanged"
              value={comparison.summary.unchangedCount}
              icon={Minus}
              color="text-gray-600"
              bg="bg-gray-50 border-gray-100"
            />
          </div>

          {/* Similar / Unchanged Findings */}
          <div>
            <SectionHeader
              icon={Minus}
              title="Similar / Unchanged Findings"
              count={comparison.unchangedFindings.length}
              color="text-gray-600"
            />
            {comparison.unchangedFindings.length === 0 ? (
              <EmptyState message="No unchanged findings between these audits." />
            ) : (
              <RecurringTable items={comparison.unchangedFindings} showTrend={false} />
            )}
          </div>

          {/* Improved Findings */}
          <div>
            <SectionHeader
              icon={TrendingUp}
              title="Improved Findings"
              count={comparison.improvedFindings.length}
              color="text-blue-600"
            />
            {comparison.improvedFindings.length === 0 ? (
              <EmptyState message="No improved findings between these audits." />
            ) : (
              <RecurringTable items={comparison.improvedFindings} />
            )}
          </div>

          {/* Worsened Findings */}
          <div>
            <SectionHeader
              icon={TrendingDown}
              title="Worsened Findings"
              count={comparison.worsenedFindings.length}
              color="text-red-600"
            />
            {comparison.worsenedFindings.length === 0 ? (
              <EmptyState message="No worsened findings between these audits." />
            ) : (
              <RecurringTable items={comparison.worsenedFindings} />
            )}
          </div>

          {/* New Findings */}
          <div>
            <SectionHeader
              icon={Plus}
              title="New Findings"
              count={comparison.newFindings.length}
              color="text-green-600"
            />
            {comparison.newFindings.length === 0 ? (
              <EmptyState message="No new findings compared to the previous audit." />
            ) : (
              <FindingTable findings={comparison.newFindings} />
            )}
          </div>

          {/* Resolved Findings */}
          <div>
            <SectionHeader
              icon={CheckCircle2}
              title="Resolved Findings"
              count={comparison.resolvedFindings.length}
              color="text-blue-600"
            />
            {comparison.resolvedFindings.length === 0 ? (
              <EmptyState message="No resolved findings compared to the previous audit." />
            ) : (
              <FindingTable findings={comparison.resolvedFindings} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
