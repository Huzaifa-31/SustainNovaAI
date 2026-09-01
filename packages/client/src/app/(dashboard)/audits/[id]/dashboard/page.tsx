"use client";

import { useParams } from "next/navigation";
import { useAudit } from "@/hooks/useAudits";

export default function AuditDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { data: audit } = useAudit(id);

  if (!audit) return null;

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">Dashboard Overview</h3>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Findings</p>
          <p className="text-2xl font-bold">{audit.findingCounts.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Critical / High</p>
          <p className="text-2xl font-bold text-red-600">
            {audit.findingCounts.critical + audit.findingCounts.high}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Risk Score</p>
          <p className={`text-2xl font-bold ${audit.riskScore > 2 ? "text-red-600" : "text-green-600"}`}>
            {audit.riskScore.toFixed(1)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Overdue CAPs</p>
          <p className={`text-2xl font-bold ${audit.capStatus.overdue > 0 ? "text-red-600" : "text-gray-600"}`}>
            {audit.capStatus.overdue}
          </p>
        </div>
      </div>

      {/* Severity Breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h4 className="mb-3 text-sm font-semibold">Findings by Severity</h4>
        <div className="flex gap-3">
          {[
            { label: "Critical", count: audit.findingCounts.critical, color: "bg-red-600" },
            { label: "High", count: audit.findingCounts.high, color: "bg-orange-500" },
            { label: "Medium", count: audit.findingCounts.medium, color: "bg-yellow-400" },
            { label: "Low", count: audit.findingCounts.low, color: "bg-green-400" },
          ].map((item) => (
            <div key={item.label} className="flex-1 text-center">
              <div className={`mx-auto mb-1 h-2 rounded-full ${item.color}`} style={{ width: `${Math.max(item.count * 20, 8)}%` }} />
              <p className="text-lg font-bold">{item.count}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
