"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCreateAudit } from "@/hooks/useAudits";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useFactories } from "@/hooks/useFactories";

function NewAuditForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const userOrgId = session?.user?.organizationId;
  const preselectedOrgId = searchParams.get("orgId") || "";
  const preselectedFactoryId = searchParams.get("factoryId") || "";
  const initialOrgId = isAdmin ? preselectedOrgId : preselectedOrgId || userOrgId || "";

  const createAudit = useCreateAudit();
  const { data: orgs } = useOrganizations();
  const { data: factories } = useFactories(initialOrgId || undefined);

  const [form, setForm] = useState({
    organizationId: initialOrgId,
    factoryId: preselectedFactoryId,
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const [error, setError] = useState("");

  const availableFactories = useMemo(() => {
    if (!factories) return [];
    return factories.filter((f) => f.organizationId === form.organizationId);
  }, [factories, form.organizationId]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.organizationId) {
      setError("Please select an organization");
      return;
    }
    if (!form.factoryId) {
      setError("Please select a factory");
      return;
    }

    try {
      const audit = await createAudit.mutateAsync({
        organizationId: form.organizationId,
        factoryId: form.factoryId,
        name: form.name,
        description: form.description || undefined,
        auditPeriod: {
          start: form.startDate || undefined,
          end: form.endDate || undefined,
        },
      });
      router.push(`/audits/${audit._id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr?.response?.data?.error?.message || "Failed to create audit");
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-6 text-2xl font-bold">Create Audit</h2>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div>
          <label htmlFor="org" className="block text-sm font-medium text-gray-700">
            Organization
          </label>
          <select
            id="org"
            required
            value={form.organizationId}
            onChange={(e) => {
              update("organizationId", e.target.value);
              update("factoryId", "");
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select an organization</option>
            {orgs?.map((org) => (
              <option key={org._id} value={org._id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="factory" className="block text-sm font-medium text-gray-700">
            Factory
          </label>
          <select
            id="factory"
            required
            value={form.factoryId}
            onChange={(e) => update("factoryId", e.target.value)}
            disabled={!form.organizationId}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
          >
            <option value="">Select a factory</option>
            {availableFactories.map((factory) => (
              <option key={factory._id} value={factory._id}>
                {factory.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Audit name
          </label>
          <input
            id="name"
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            placeholder="Factory ABC — Social Compliance Audit — 2026"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            placeholder="Brief description of the audit scope"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start date <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              End date <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="endDate"
              type="date"
              value={form.endDate}
              onChange={(e) => update("endDate", e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createAudit.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createAudit.isPending ? "Creating..." : "Create Audit"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewAuditPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
      <NewAuditForm />
    </Suspense>
  );
}
