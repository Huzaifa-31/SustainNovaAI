"use client";

import Link from "next/link";
import { useOrganizations } from "@/hooks/useOrganizations";

export default function OrganizationsPage() {
  const { data: orgs, isLoading, error } = useOrganizations();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Organizations</h2>
        <Link
          href="/organizations/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New Organization
        </Link>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">Failed to load organizations</p>}

      {orgs && orgs.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No organizations yet.</p>
          <Link href="/organizations/new" className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500">
            Create your first organization
          </Link>
        </div>
      )}

      {orgs && orgs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <Link
              key={org._id}
              href={`/organizations/${org._id}`}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
              {org.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{org.description}</p>}
              <p className="mt-3 text-xs text-gray-400">
                Created {new Date(org.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
