"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useFactory, useUpdateFactory, useDeleteFactory } from "@/hooks/useFactories";

export default function FactoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const factoryId = params.id as string;

  const { data: factory, isLoading } = useFactory(factoryId);
  const updateFactory = useUpdateFactory();
  const deleteFactory = useDeleteFactory();

  const [form, setForm] = useState({ name: "", description: "", location: "" });

  useEffect(() => {
    if (factory) {
      setForm({
        name: factory.name,
        description: factory.description || "",
        location: factory.location || "",
      });
    }
  }, [factory]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    updateFactory.mutate(
      {
        factoryId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        location: form.location.trim() || undefined,
      },
      {
        onSuccess: () => router.push("/factories"),
      },
    );
  }

  function handleDelete() {
    if (!factory) return;
    if (!confirm("Are you sure you want to delete this factory?")) return;

    deleteFactory.mutate(
      { factoryId, organizationId: factory.organizationId },
      { onSuccess: () => router.push("/factories") },
    );
  }

  if (isLoading) return <p className="text-gray-500">Loading factory...</p>;
  if (!factory) return <p className="text-gray-500">Factory not found.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link href="/factories" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          Back to factories
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-gray-900">Edit Factory</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">Factory name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteFactory.isPending}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleteFactory.isPending ? "Deleting..." : "Delete"}
          </button>
          <div className="flex gap-3">
            <Link
              href="/factories"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={updateFactory.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateFactory.isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
