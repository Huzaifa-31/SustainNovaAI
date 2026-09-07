"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCreateFactory } from "@/hooks/useFactories";
import { useOrganizations } from "@/hooks/useOrganizations";

export default function NewFactoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: orgs } = useOrganizations();
  const createFactory = useCreateFactory();

  const isAdmin = session?.user?.role === "admin";
  const userOrgId = session?.user?.organizationId;

  const [form, setForm] = useState({
    organizationId: isAdmin ? "" : userOrgId || "",
    name: "",
    description: "",
    location: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.organizationId || !form.name.trim()) return;

    createFactory.mutate(
      {
        organizationId: form.organizationId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        location: form.location.trim() || undefined,
      },
      {
        onSuccess: () => router.push("/factories"),
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/factories" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          Back to factories
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-gray-900">Create Factory</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Organization</label>
            <select
              value={form.organizationId}
              onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select organization</option>
              {orgs?.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Factory name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Factory A"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="City, Country"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Optional description"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/factories"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createFactory.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createFactory.isPending ? "Creating..." : "Create factory"}
          </button>
        </div>
      </form>
    </div>
  );
}
