"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  FileText,
  ShieldAlert,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ArrowRight,
  Clock,
  Filter,
  Calendar,
  AlertTriangle as FindingIcon,
  Building2,
  Factory,
  Settings,
  Users,
  Plus,
} from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import type { OrgDashboardData, AdminDashboardData, FactoryDashboard } from "@/hooks/useDashboard";

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
  Info: "#3b82f6",
};

const CAP_COLORS: Record<string, string> = {
  Open: "#2563eb",
  "In Progress": "#f59e0b",
  Resolved: "#22c55e",
  Overdue: "#ef4444",
  Closed: "#9ca3af",
};

const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"];
const CAP_ORDER = ["Open", "In Progress", "Resolved", "Overdue", "Closed"];

function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  iconBg,
  trendUp = true,
}: {
  label: string;
  value: number;
  trend?: string;
  icon: React.ElementType;
  iconBg: string;
  trendUp?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`mt-1 flex items-center gap-1 text-xs ${trendUp ? "text-green-600" : "text-red-600"}`}>
              {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend} vs last month
            </p>
          )}
        </div>
        <div className={`rounded-xl ${iconBg} p-2.5`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, href, linkText }: { title: string; href?: string; linkText?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
          {linkText ?? "View all"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function DonutWithLegend({
  data,
  total,
  centerLabel,
  totalLabel,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  total: number;
  centerLabel: string;
  totalLabel: string;
}) {
  const orderedData = data.sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.name) - SEVERITY_ORDER.indexOf(b.name),
  );

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={orderedData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={78}
              paddingAngle={2}
              dataKey="value"
            >
              {orderedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <RechartsTooltip formatter={(value: number, name: string) => [`${value}`, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-xs text-gray-500">{totalLabel}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        {orderedData.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-gray-600">{item.name}</span>
            </div>
            <span className="font-semibold text-gray-900">
              {item.value} ({Math.round((item.value / Math.max(total, 1)) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CapDonutWithLegend({
  data,
  total,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  total: number;
}) {
  const orderedData = data.sort(
    (a, b) => CAP_ORDER.indexOf(a.name) - CAP_ORDER.indexOf(b.name),
  );

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={orderedData}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={2}
              dataKey="value"
            >
              {orderedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <RechartsTooltip formatter={(value: number, name: string) => [`${value}`, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{total}</span>
          <span className="text-[10px] text-gray-500">Total Actions</span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {orderedData.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-gray-600">{item.name}</span>
            </div>
            <span className="font-semibold text-gray-900">
              {item.value} ({Math.round((item.value / Math.max(total, 1)) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarChart({ data }: { data: Array<{ category: string; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.category} className="flex items-center gap-3">
          <div className="w-36 shrink-0 text-xs font-medium text-gray-600 sm:w-40">{item.category}</div>
          <div className="flex-1">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
          <div className="w-8 text-right text-sm font-semibold text-gray-900">{item.count}</div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-orange-100 text-orange-700",
    completed: "bg-green-100 text-green-700",
    archived: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status === "active" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    Critical: "bg-red-100 text-red-700",
    High: "bg-orange-100 text-orange-700",
    Medium: "bg-yellow-100 text-yellow-700",
    Low: "bg-green-100 text-green-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[severity] ?? "bg-gray-100 text-gray-600"}`}>
      {severity}
    </span>
  );
}

function MiniTrend({ direction }: { direction: "up" | "down" | "flat" }) {
  const points = direction === "up"
    ? "0,30 20,20 40,22 60,10 80,12 100,5"
    : direction === "down"
      ? "0,10 20,18 40,15 60,25 80,22 100,30"
      : "0,18 20,17 40,19 60,18 80,17 100,18";

  const color = direction === "up" ? "#22c55e" : direction === "down" ? "#ef4444" : "#9ca3af";

  return (
    <svg viewBox="0 0 100 35" className="h-10 w-full" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
      <circle cx="100" cy={direction === "up" ? 5 : direction === "down" ? 30 : 18} r="3" fill={color} />
    </svg>
  );
}

function FactoryCard({ factory, orgId }: { factory: FactoryDashboard; orgId: string }) {
  return (
    <Link
      href={`/audits?factoryId=${factory._id}&orgId=${orgId}`}
      className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
          <Factory className="h-5 w-5 text-blue-600" />
        </div>
        <h4 className="font-semibold text-gray-900">{factory.name}</h4>
      </div>
      {factory.location && <p className="mb-3 text-sm text-gray-500">{factory.location}</p>}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-gray-50 p-2">
          <p className="font-semibold text-gray-900">{factory.totalAudits}</p>
          <p className="text-xs text-gray-500">Audits</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <p className="font-semibold text-gray-900">{factory.totalFindings}</p>
          <p className="text-xs text-gray-500">Findings</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <p className="font-semibold text-gray-900">{factory.openCaps}</p>
          <p className="text-xs text-gray-500">Open CAPs</p>
        </div>
      </div>
    </Link>
  );
}

function OrgDashboard({ data }: { data: OrgDashboardData }) {
  const severityChartData = [
    { name: "Critical", value: data.riskSummary.bySeverity.Critical, color: SEVERITY_COLORS.Critical },
    { name: "High", value: data.riskSummary.bySeverity.High, color: SEVERITY_COLORS.High },
    { name: "Medium", value: data.riskSummary.bySeverity.Medium, color: SEVERITY_COLORS.Medium },
    { name: "Low", value: data.riskSummary.bySeverity.Low, color: SEVERITY_COLORS.Low },
  ].filter((d) => d.value > 0);

  const capChartData = [
    { name: "Open", value: data.correctiveActionsOverview.open, color: CAP_COLORS.Open },
    { name: "In Progress", value: data.correctiveActionsOverview.inProgress, color: CAP_COLORS["In Progress"] },
    { name: "Resolved", value: data.correctiveActionsOverview.resolved, color: CAP_COLORS.Resolved },
    { name: "Overdue", value: data.correctiveActionsOverview.overdue, color: CAP_COLORS.Overdue },
    { name: "Closed", value: data.correctiveActionsOverview.closed, color: CAP_COLORS.Closed },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Org header */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">{data.organization.name}</h2>
          </div>
          {data.organization.description && (
            <p className="mt-1 text-sm text-gray-500">{data.organization.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            {data.organization.tier}
          </span>
          <Link
            href="/factories/new"
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Factory
          </Link>
        </div>
      </div>

      {/* Factories grid */}
      <div>
        <SectionHeader title="Factories" href="/factories" />
        {data.factories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
            <Factory className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-900">No factories yet</p>
            <p className="mt-1">Create a factory to start running audits.</p>
            <Link
              href="/factories/new"
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create factory
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.factories.map((factory) => (
              <FactoryCard key={factory._id} factory={factory} orgId={data.organization._id} />
            ))}
          </div>
        )}
      </div>

      {data.summary.totalAnalyses === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No audit data yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create an audit inside a factory to see analytics.</p>
          <Link
            href="/audits/new"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create your first audit
          </Link>
        </div>
      ) : (
        <>
          {/* Top Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total Analyses" value={data.summary.totalAnalyses} trend="20%" icon={FileText} iconBg="bg-blue-500" />
            <StatCard label="Critical Findings" value={data.summary.criticalFindings} trend="33%" icon={ShieldAlert} iconBg="bg-red-500" trendUp={false} />
            <StatCard label="High Risk Findings" value={data.summary.highRiskFindings} trend="12%" icon={AlertTriangle} iconBg="bg-orange-500" trendUp={false} />
            <StatCard label="Pending Actions" value={data.summary.pendingActions} trend="8%" icon={ClipboardList} iconBg="bg-indigo-500" trendUp={false} />
            <StatCard label="Resolved Actions" value={data.summary.resolvedActions} trend="25%" icon={CheckCircle2} iconBg="bg-green-500" />
          </div>

          {/* Row 1 */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <SectionHeader title="Risk Summary" href="/audits" linkText="View all findings" />
              <DonutWithLegend
                data={severityChartData}
                total={data.riskSummary.totalFindings}
                centerLabel="Total Findings"
                totalLabel="Total Findings"
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <SectionHeader title="Findings by Category" href="/audits" linkText="View full report" />
              {data.findingsByCategory.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-500">No findings yet.</p>
              ) : (
                <HorizontalBarChart data={data.findingsByCategory} />
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <SectionHeader title="Recent Analyses" href="/audits" linkText="View all" />
              <div className="space-y-3">
                {data.recentAnalyses.map((analysis) => (
                  <Link
                    key={analysis._id}
                    href={`/audits/${analysis._id}`}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition hover:bg-gray-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{analysis.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(analysis.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        {analysis.type}
                      </p>
                    </div>
                    <StatusBadge status={analysis.status} />
                  </Link>
                ))}
                {data.recentAnalyses.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-500">No analyses yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <SectionHeader title="Report Comparison Overview" href="/audits" linkText="View all comparisons" />

              {data.comparisonOverview.featured ? (
                <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-center text-sm">
                  <span className="font-medium text-gray-900">{data.comparisonOverview.featured.previousAuditName}</span>
                  <span className="mx-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-600">VS</span>
                  <span className="font-medium text-gray-900">{data.comparisonOverview.featured.currentAuditName}</span>
                </div>
              ) : (
                <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-center text-sm text-gray-500">
                  Link audits to see comparisons
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-green-100 bg-green-50/50 p-4">
                  <p className="text-xs font-medium text-green-700">Improved</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{data.comparisonOverview.improved}</p>
                  <MiniTrend direction="up" />
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                  <p className="text-xs font-medium text-red-700">Worsened</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{data.comparisonOverview.worsened}</p>
                  <MiniTrend direction="down" />
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-xs font-medium text-blue-700">New Findings</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{data.comparisonOverview.newFindings}</p>
                  <MiniTrend direction="up" />
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-600">Unchanged</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{data.comparisonOverview.unchanged}</p>
                  <MiniTrend direction="flat" />
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3">
                <SparklesIcon />
                <p className="text-xs text-blue-800">
                  <span className="font-semibold">AI Insight:</span> Overall performance is tracked across audits with previous assessments. Critical issues are highlighted for review.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <SectionHeader title="Top Findings (High & Critical)" href="/audits" linkText="View all" />
              <div className="space-y-3">
                {data.topFindings.map((finding) => (
                  <Link
                    key={finding._id}
                    href={`/audits/${finding._id}`}
                    className="group flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition hover:bg-gray-50"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
                      <FindingIcon className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-gray-900 group-hover:text-blue-600">{finding.title}</p>
                        <SeverityBadge severity={finding.severity} />
                      </div>
                      <p className="text-xs text-gray-500">
                        {finding.category} {finding.sourcePage ? `• Page ${finding.sourcePage}` : ""}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-blue-600" />
                  </Link>
                ))}
                {data.topFindings.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-500">No high or critical findings.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <SectionHeader title="Corrective Actions Overview" href="/audits" linkText="View all" />
              <CapDonutWithLegend data={capChartData} total={data.correctiveActionsOverview.total} />
              {data.correctiveActionsOverview.overdue > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <Clock className="h-4 w-4" />
                  <span className="flex-1">{data.correctiveActionsOverview.overdue} actions are overdue</span>
                  <Link href="/audits" className="font-medium hover:underline">
                    View now
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Admin Overview</h2>
        <p className="text-sm text-gray-500">Manage organizations and their factories</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Organizations" value={data.summary.totalOrganizations} icon={Building2} iconBg="bg-blue-500" />
        <StatCard label="Factories" value={data.summary.totalFactories} icon={Factory} iconBg="bg-indigo-500" />
        <StatCard label="Total Audits" value={data.summary.totalAnalyses} icon={FileText} iconBg="bg-green-500" />
        <StatCard label="Total Findings" value={data.summary.totalFindings} icon={ShieldAlert} iconBg="bg-red-500" trendUp={false} />
      </div>

      <div>
        <SectionHeader title="Organizations" href="/organizations" />
        {data.organizations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-900">No organizations yet</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.organizations.map((org) => (
              <div
                key={org._id}
                onClick={() => router.push(`/organizations/${org._id}`)}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{org.name}</h3>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold uppercase text-blue-700">
                    {org.tier}
                  </span>
                </div>
                <div className="mb-3 flex flex-wrap gap-1">
                  {(org.services ?? []).map((service) => (
                    <span
                      key={service}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-600"
                    >
                      {service}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="font-semibold text-gray-900">{org.factoryCount}</p>
                    <p className="text-xs text-gray-500">Factories</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="font-semibold text-gray-900">{org.auditCount}</p>
                    <p className="text-xs text-gray-500">Audits</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="font-semibold text-gray-900">{org.findingCount}</p>
                    <p className="text-xs text-gray-500">Findings</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>();
  const { data, isLoading } = useDashboard(selectedOrgId);

  const userName = session?.user?.name ?? "Admin";
  const role = session?.user?.role;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">No dashboard data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter / Date toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Welcome, {userName}</h1>
          <p className="text-sm text-gray-500">Role: {role}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Calendar className="h-4 w-4" />
            May 1 - May 31, 2024
          </button>
        </div>
      </div>

      {data.role === "admin" ? (
        <AdminDashboard data={data as AdminDashboardData} />
      ) : (
        <OrgDashboard data={data as OrgDashboardData} />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>Last updated: {new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
        </div>
        <span>SustainNova AI Audit Intelligence Platform</span>
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3L14.5 8.5L20 11L14.5 13.5L12 19L9.5 13.5L4 11L9.5 8.5L12 3Z" />
    </svg>
  );
}
