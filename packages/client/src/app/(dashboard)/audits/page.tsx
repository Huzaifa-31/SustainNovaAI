"use client";

import Link from "next/link";
import { useAudits } from "@/hooks/useAudits";

export default function AuditsPage() {
  const { data: audits, isLoading, error } = useAudits();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Audits</h2>
        <Link
          href="/audits/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New Audit
        </Link>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">Failed to load audits</p>}

      {audits && audits.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No audits yet.</p>
          <Link href="/audits/new" className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500">
            Create your first audit
          </Link>
        </div>
      )}

      {audits && audits.length > 0 && (
        <div className="space-y-3">
          {audits.map((audit) => (
            <Link
              key={audit._id}
              href={`/audits/${audit._id}`}
              className="block rounded-lg border border-gray-200 bg-white p-5 transition hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{audit.name}</h3>
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
              {audit.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{audit.description}</p>}
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span>{audit.findingCounts.total} findings</span>
                <span>
                  Risk: <strong className={audit.riskScore > 2 ? "text-red-600" : "text-gray-600"}>{audit.riskScore.toFixed(1)}</strong>
                </span>
                <span>CAPs: {audit.capStatus.open} open / {audit.capStatus.closed} closed</span>
                <span>Created {new Date(audit.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
