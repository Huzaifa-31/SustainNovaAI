"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Factory, Plus, ArrowRight, Building2 } from "lucide-react";
import { useFactories, useDeleteFactory } from "@/hooks/useFactories";
import { useOrganizations } from "@/hooks/useOrganizations";

export default function FactoriesPage() {
  const { data: session } = useSession();
  const { data: orgs } = useOrganizations();
  const organizationId = session?.user?.organizationId;
  const isAdmin = session?.user?.role === "admin";

  const { data: factories, isLoading } = useFactories(
    isAdmin ? undefined : organizationId,
  );
  const deleteFactory = useDeleteFactory();

  const orgNameMap = new Map(orgs?.map((o) => [o._id, o.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Factories</h2>
          <p className="text-sm text-gray-500">Manage factories under your organization</p>
        </div>
        <Link
          href="/factories/new"
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Factory
        </Link>
      </div>

      {isLoading && <p className="text-gray-500">Loading factories...</p>}

      {!isLoading && (!factories || factories.length === 0) && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          <Factory className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-900">No factories yet</p>
          <p className="mt-1">Create your first factory to start running audits.</p>
          <Link
            href="/factories/new"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create factory
          </Link>
        </div>
      )}

      {factories && factories.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {factories.map((factory) => (
            <div
              key={factory._id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                  <Factory className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{factory.name}</h3>
                  {isAdmin && (
                    <p className="text-xs text-gray-500">{orgNameMap.get(factory.organizationId)}</p>
                  )}
                </div>
              </div>
              {factory.location && <p className="mb-3 text-sm text-gray-500">{factory.location}</p>}
              {factory.description && <p className="mb-3 text-sm text-gray-500 line-clamp-2">{factory.description}</p>}
              <div className="flex items-center gap-2">
                <Link
                  href={`/audits/new?factoryId=${factory._id}`}
                  className="flex-1 rounded-lg border border-blue-200 bg-blue-50 py-2 text-center text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  New audit
                </Link>
                <Link
                  href={`/factories/${factory._id}`}
                  className="flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Edit
                </Link>
                <button
                  onClick={() =>
                    deleteFactory.mutate({ factoryId: factory._id, organizationId: factory.organizationId })
                  }
                  disabled={deleteFactory.isPending}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
