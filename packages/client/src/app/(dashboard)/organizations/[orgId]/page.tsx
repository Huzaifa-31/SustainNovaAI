"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useOrganization, useUpdateOrganizationServices } from "@/hooks/useOrganizations";
import { useOrgAudits } from "@/hooks/useAudits";

const AVAILABLE_SERVICES = ["audit", "compare", "assistant", "documents", "findings", "caps"];

export default function OrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: auditData, isLoading: auditsLoading } = useOrgAudits(orgId);
  const updateServices = useUpdateOrganizationServices();

  const [services, setServices] = useState<string[]>([]);
  const [tier, setTier] = useState<"basic" | "pro" | "enterprise">("basic");

  useEffect(() => {
    if (org) {
      setServices(org.services ?? []);
      setTier(org.tier ?? "basic");
    }
  }, [org]);

  if (orgLoading) return <p className="text-gray-500">Loading...</p>;
  if (!org) return <p className="text-red-600">Organization not found</p>;

  const members = Array.isArray(org.memberIds) ? org.memberIds : [];

  const handleServiceToggle = (service: string) => {
    setServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  };

  const handleSaveAccess = () => {
    updateServices.mutate({ orgId, services, tier });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{org.name}</h2>
        {org.description && <p className="mt-1 text-gray-500">{org.description}</p>}
      </div>

      {/* Service Access — admin only */}
      {isAdmin && (
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold">Service Access</h3>
          <p className="mb-4 text-sm text-gray-500">
            Choose which features this organization can access and its subscription tier.
          </p>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-gray-700">Allowed services</label>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_SERVICES.map((service) => (
                <label
                  key={service}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={services.includes(service)}
                    onChange={() => handleServiceToggle(service)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="capitalize text-gray-700">{service}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-gray-700">Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as "basic" | "pro" | "enterprise")}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <button
            onClick={handleSaveAccess}
            disabled={updateServices.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {updateServices.isPending ? "Saving..." : "Save access settings"}
          </button>
        </section>
      )}

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
