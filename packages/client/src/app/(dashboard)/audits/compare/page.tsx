"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  GitCompare,
  ArrowRight,
  Plus,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Search,
} from "lucide-react";
import { useComparisonReports } from "@/hooks/useComparisonReports";
import { useAudits } from "@/hooks/useAudits";

function SummaryBadge({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-gray-600">{label}:</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function AuditSelect({
  label,
  value,
  onChange,
  audits,
  excludeId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  audits: { _id: string; name: string; organizationId: string }[];
  excludeId?: string;
}) {
  return (
    <div className="flex-1 space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select an audit</option>
          {audits
            .filter((a) => a._id !== excludeId)
            .map((audit) => (
              <option key={audit._id} value={audit._id}>
                {audit.name}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}

export default function CompareReportsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const organizationId = isAdmin ? undefined : session?.user?.organizationId;
  const { data: reports, isLoading, isError, error } = useComparisonReports(organizationId);
  const { data: audits, isLoading: isAuditsLoading } = useAudits(organizationId);

  const [currentAuditId, setCurrentAuditId] = useState("");
  const [previousAuditId, setPreviousAuditId] = useState("");

  const canCompare = currentAuditId && previousAuditId;

  const handleCompare = () => {
    if (!canCompare) return;
    router.push(`/audits/${currentAuditId}/compare?previousAuditId=${previousAuditId}`);
  };

  const sortedAudits = useMemo(() => {
    if (!audits) return [];
    return [...audits].sort((a, b) => a.name.localeCompare(b.name));
  }, [audits]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Compare Reports</h2>
        <p className="text-sm text-gray-500">Compare audits across your organizations</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Compare two audits</h3>
        </div>

        <div className="flex flex-col items-end gap-4 md:flex-row">
          <AuditSelect
            label="Current audit"
            value={currentAuditId}
            onChange={(id) => {
              setCurrentAuditId(id);
              if (previousAuditId === id) setPreviousAuditId("");
            }}
            audits={sortedAudits}
            excludeId={previousAuditId}
          />
          <div className="flex h-10 items-center justify-center text-gray-400">
            <ArrowRight className="h-5 w-5" />
          </div>
          <AuditSelect
            label="Previous audit"
            value={previousAuditId}
            onChange={(id) => {
              setPreviousAuditId(id);
              if (currentAuditId === id) setCurrentAuditId("");
            }}
            audits={sortedAudits}
            excludeId={currentAuditId}
          />
          <button
            onClick={handleCompare}
            disabled={!canCompare || isAuditsLoading}
            className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 md:w-auto"
          >
            Compare
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold text-gray-900">Saved comparison reports</h3>

        {isLoading && (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12 text-sm text-gray-500 shadow-sm">
            Loading comparison reports...
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error instanceof Error ? error.message : "Failed to load comparison reports"}
            </div>
          </div>
        )}

        {!isLoading && !isError && reports && reports.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm">
            <div className="mb-3 flex justify-center">
              <GitCompare className="h-10 w-10 text-gray-300" />
            </div>
            <p className="font-medium text-gray-900">No saved comparison reports yet</p>
            <p className="mt-1">Link a previous audit to an audit or use the selector above to compare.</p>
          </div>
        )}

        {!isLoading && !isError && reports && reports.length > 0 && (
          <div className="grid gap-4">
            {reports.map((report) => (
              <Link
                key={report.currentAuditId}
                href={`/audits/${report.currentAuditId}/compare`}
                className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      <span className="font-medium text-gray-900">{report.currentAuditName}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span className="font-medium text-gray-900">{report.previousAuditName}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <SummaryBadge icon={GitCompare} label="Current" value={report.summary.currentTotal} color="text-gray-700" />
                      <SummaryBadge icon={GitCompare} label="Previous" value={report.summary.previousTotal} color="text-gray-700" />
                      <SummaryBadge icon={Plus} label="New" value={report.summary.newCount} color="text-green-600" />
                      <SummaryBadge icon={CheckCircle2} label="Resolved" value={report.summary.resolvedCount} color="text-blue-600" />
                      <SummaryBadge icon={TrendingUp} label="Improved" value={report.summary.improvedCount} color="text-green-600" />
                      <SummaryBadge icon={Minus} label="Unchanged" value={report.summary.unchangedCount} color="text-gray-600" />
                      <SummaryBadge icon={TrendingDown} label="Worsened" value={report.summary.worsenedCount} color="text-red-600" />
                      <SummaryBadge icon={RefreshCw} label="Recurring" value={report.summary.recurringCount} color="text-orange-600" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700">
                    View comparison
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
