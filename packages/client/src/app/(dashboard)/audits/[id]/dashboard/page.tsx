"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Search,
  ShieldAlert,
  Gauge,
  Clock,
  ClipboardCheck,
  ArrowRight,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useAudit } from "@/hooks/useAudits";
import { useFindingSummary } from "@/hooks/useFindings";
import { useCAPSummary } from "@/hooks/useCAPs";
import { useFindings } from "@/hooks/useFindings";

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
};

const STATUS_COLORS: Record<string, string> = {
  Open: "#3b82f6",
  "In Progress": "#f59e0b",
  Closed: "#22c55e",
};

const CAP_COLORS: Record<string, string> = {
  draft: "#9ca3af",
  approved: "#3b82f6",
  assigned: "#8b5cf6",
  in_progress: "#f59e0b",
  evidence_submitted: "#06b6d4",
  review: "#f97316",
  closed: "#22c55e",
};

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconBg,
  valueColor = "text-gray-900",
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  iconBg: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</p>
          {subtext && <p className="mt-1 text-xs text-gray-500">{subtext}</p>}
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

function DonutChart({
  data,
  total,
  centerLabel,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  total: number;
  centerLabel: string;
}) {
  return (
    <div className="relative h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={78}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
            ))}
          </Pie>
          <RechartsTooltip formatter={(value: number, name: string) => [`${value}`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{total}</span>
        <span className="text-xs text-gray-500">{centerLabel}</span>
      </div>
    </div>
  );
}

function HorizontalBarChart({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.name} className="flex items-center gap-3">
          <div className="w-28 shrink-0 text-xs font-medium text-gray-600 sm:w-32">{item.name}</div>
          <div className="flex-1">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
          <div className="w-8 text-right text-sm font-semibold text-gray-900">{item.value}</div>
        </div>
      ))}
    </div>
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

export default function AuditDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { data: audit } = useAudit(id);
  const { data: findingSummary } = useFindingSummary(id);
  const { data: capSummary } = useCAPSummary(id);
  const { data: findingsData } = useFindings(id, { limit: 5 });

  if (!audit) return null;

  const topFindings = findingsData?.findings ?? [];

  const severityData = findingSummary
    ? [
        { name: "Critical", value: findingSummary.bySeverity.Critical || 0, color: SEVERITY_COLORS.Critical },
        { name: "High", value: findingSummary.bySeverity.High || 0, color: SEVERITY_COLORS.High },
        { name: "Medium", value: findingSummary.bySeverity.Medium || 0, color: SEVERITY_COLORS.Medium },
        { name: "Low", value: findingSummary.bySeverity.Low || 0, color: SEVERITY_COLORS.Low },
      ].filter((d) => d.value > 0)
    : [];

  const statusData = findingSummary
    ? [
        { name: "Open", value: findingSummary.byStatus.Open || 0, color: STATUS_COLORS.Open },
        { name: "In Progress", value: findingSummary.byStatus["In Progress"] || 0, color: STATUS_COLORS["In Progress"] },
        { name: "Closed", value: findingSummary.byStatus.Closed || 0, color: STATUS_COLORS.Closed },
      ].filter((d) => d.value > 0)
    : [];

  const categoryData = findingSummary
    ? Object.entries(findingSummary.byCategory)
        .map(([name, value]) => ({ name, value, color: "#2563eb" }))
        .sort((a, b) => b.value - a.value)
    : [];

  const capStatusData = capSummary
    ? Object.entries(capSummary.byStatus)
        .map(([name, value]) => ({ name, value, color: CAP_COLORS[name] ?? "#9ca3af" }))
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Dashboard Overview</h3>
        <p className="text-sm text-gray-500">Summary of findings, risk, and corrective actions</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Findings"
          value={audit.findingCounts.total}
          subtext={`${audit.findingCounts.critical} critical`}
          icon={Search}
          iconBg="bg-blue-500"
        />
        <StatCard
          label="Critical / High"
          value={audit.findingCounts.critical + audit.findingCounts.high}
          subtext="Needs attention"
          icon={ShieldAlert}
          iconBg="bg-red-500"
          valueColor="text-red-600"
        />
        <StatCard
          label="Risk Score"
          value={audit.riskScore.toFixed(1)}
          subtext="Out of 4.0"
          icon={Gauge}
          iconBg="bg-orange-500"
          valueColor={audit.riskScore > 2 ? "text-red-600" : "text-green-600"}
        />
        <StatCard
          label="Open CAPs"
          value={audit.capStatus.open + audit.capStatus.inProgress}
          subtext={`${audit.capStatus.overdue} overdue`}
          icon={ClipboardCheck}
          iconBg="bg-indigo-500"
        />
        <StatCard
          label="Overdue CAPs"
          value={audit.capStatus.overdue}
          subtext={audit.capStatus.overdue > 0 ? "Action required" : "On track"}
          icon={Clock}
          iconBg={audit.capStatus.overdue > 0 ? "bg-red-500" : "bg-green-500"}
          valueColor={audit.capStatus.overdue > 0 ? "text-red-600" : "text-gray-900"}
        />
      </div>

      {/* Row 1 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Risk Summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionHeader title="Risk Summary" href={`/audits/${id}/findings`} linkText="View findings" />
          {severityData.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No findings yet.</p>
          ) : (
            <DonutChart data={severityData} total={findingSummary?.total ?? 0} centerLabel="Findings" />
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {severityData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.name}</span>
                <span className="ml-auto font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Findings by Category */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionHeader title="Findings by Category" href={`/audits/${id}/findings`} linkText="View all" />
          {categoryData.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No findings yet.</p>
          ) : (
            <HorizontalBarChart data={categoryData} />
          )}
        </div>

        {/* Findings by Status */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionHeader title="Findings by Status" href={`/audits/${id}/findings`} linkText="View all" />
          {statusData.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No findings yet.</p>
          ) : (
            <DonutChart data={statusData} total={findingSummary?.total ?? 0} centerLabel="Findings" />
          )}
          <div className="mt-4 space-y-2">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CAP Overview */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionHeader title="Corrective Actions Overview" href={`/audits/${id}/caps`} linkText="View all" />
          {capStatusData.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No corrective actions yet.</p>
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={capStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {capStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number, name: string) => [`${value}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">{capSummary?.total ?? 0}</span>
                  <span className="text-[10px] text-gray-500">Total</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {capStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600 capitalize">{item.name.replace(/_/g, " ")}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Findings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionHeader title="Top Findings" href={`/audits/${id}/findings`} linkText="View all" />
          <div className="space-y-3">
            {topFindings.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">No findings yet.</p>
            ) : (
              topFindings.map((finding) => (
                <Link
                  key={finding._id}
                  href={`/audits/${id}/findings`}
                  className="group flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition hover:bg-gray-50"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900 group-hover:text-blue-600">
                        {finding.title}
                      </p>
                      <SeverityBadge severity={finding.severity} />
                    </div>
                    <p className="text-xs text-gray-500">
                      {finding.category} {finding.sourcePage ? `• Page ${finding.sourcePage}` : ""}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-blue-600" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
