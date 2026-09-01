"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useOrganization } from "@/hooks/useOrganizations";
import { useOrgAudits } from "@/hooks/useAudits";

export default function OrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: auditData, isLoading: auditsLoading } = useOrgAudits(orgId);

  if (orgLoading) return <p className="text-gray-500">Loading...</p>;
  if (!org) return <p className="text-red-600">Organization not found</p>;

  const members = Array.isArray(org.memberIds) ? org.memberIds : [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{org.name}</h2>
        {org.description && <p className="mt-1 text-gray-500">{org.description}</p>}
      </div>

      {/* Members Section */}
      <section className="mb-8">
        <h3 className="mb-3 text-lg font-semibold">Members ({members.length})</h3>
        <div className="rounded-lg border border-gray-200 bg-white divide-y">
          {members.map((member) => {
            const m = member as { _id: string; name: string; email: string; role: string };
            return (
              <div key={m._id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.email}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 capitalize">
                  {m.role}
                </span>
              </div>
            );
          })}
          {members.length === 0 && <p className="px-4 py-3 text-sm text-gray-500">No members yet</p>}
        </div>
      </section>

      {/* Audits Section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Audits</h3>
          <Link
            href={`/audits/new?orgId=${orgId}`}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            New Audit
          </Link>
        </div>

        {auditsLoading && <p className="text-gray-500">Loading audits...</p>}

        {auditData && auditData.audits.length === 0 && (
          <p className="text-sm text-gray-500">No audits for this organization yet.</p>
        )}

        {auditData && auditData.audits.length > 0 && (
          <div className="space-y-2">
            {auditData.audits.map((audit) => (
              <Link
                key={audit._id}
                href={`/audits/${audit._id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{audit.name}</h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
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
                {audit.description && <p className="mt-1 text-sm text-gray-500 line-clamp-1">{audit.description}</p>}
                <p className="mt-2 text-xs text-gray-400">
                  {audit.findingCounts.total} findings · Risk: {audit.riskScore.toFixed(1)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
