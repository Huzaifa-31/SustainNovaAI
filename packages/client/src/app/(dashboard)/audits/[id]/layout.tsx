"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useAudit } from "@/hooks/useAudits";

const tabs = [
  { href: "dashboard", label: "Dashboard" },
  { href: "documents", label: "Documents" },
  { href: "findings", label: "Findings" },
  { href: "caps", label: "CAPs" },
  { href: "qa", label: "AI Assistant" },
  { href: "compare", label: "Compare" },
  { href: "logs", label: "Logs" },
  { href: "export", label: "Export" },
] as const;

export default function AuditDetailLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const { data: audit, isLoading } = useAudit(id);

  if (isLoading) return <p className="text-gray-500">Loading audit...</p>;
  if (!audit) return <p className="text-red-600">Audit not found</p>;

  return (
    <div>
      {/* Audit Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">{audit.name}</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              audit.status === "active"
                ? "bg-green-100 text-green-700"
                : audit.status === "completed"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            {audit.status}
          </span>
        </div>
        {audit.description && <p className="mt-1 text-sm text-gray-500">{audit.description}</p>}

        {/* Quick Stats */}
        <div className="mt-3 flex items-center gap-6 text-sm text-gray-600">
          <span>
            Findings: <strong>{audit.findingCounts.total}</strong>
            {" "}
            <span className="text-red-600">({audit.findingCounts.critical} critical)</span>
          </span>
          <span>
            Risk: <strong className={audit.riskScore > 2 ? "text-red-600" : ""}>{audit.riskScore.toFixed(1)}</strong>/4.0
          </span>
          <span>
            CAPs: <strong>{audit.capStatus.open}</strong> open / <strong>{audit.capStatus.closed}</strong> closed
            {audit.capStatus.overdue > 0 && (
              <span className="ml-1 text-red-600">({audit.capStatus.overdue} overdue)</span>
            )}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => {
            const isActive = pathname === `/audits/${id}/${tab.href}`;
            return (
              <Link
                key={tab.href}
                href={`/audits/${id}/${tab.href}`}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {children}
    </div>
  );
}
