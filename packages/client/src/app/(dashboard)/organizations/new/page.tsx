"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateOrganization } from "@/hooks/useOrganizations";

export default function NewOrganizationPage() {
  const router = useRouter();
  const createOrg = useCreateOrganization();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const org = await createOrg.mutateAsync({
        name,
        description: description || undefined,
        ownerName,
        ownerEmail,
        ownerPassword,
      });
      router.push(`/organizations/${org._id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string; code?: string } } } };
      const message = axiosErr?.response?.data?.error?.message || "Failed to create organization";
      setError(message);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-6 text-2xl font-bold">Create Organization</h2>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Organization name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            placeholder="Acme Corp"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            placeholder="Brief description of the organization"
          />
        </div>

        <div className="border-t border-gray-100 pt-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Organization owner account</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700">
                Owner name
              </label>
              <input
                id="ownerName"
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="ownerEmail" className="block text-sm font-medium text-gray-700">
                Owner email / username
              </label>
              <input
                id="ownerEmail"
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="owner@example.com"
              />
            </div>

            <div>
              <label htmlFor="ownerPassword" className="block text-sm font-medium text-gray-700">
                Owner password
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="ownerPassword"
                  type="text"
                  required
                  minLength={8}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => {
                    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
                    let pwd = "";
                    for (let i = 0; i < 16; i++) {
                      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    setOwnerPassword(pwd);
                  }}
                  className="whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createOrg.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createOrg.isPending ? "Creating..." : "Create Organization"}
          </button>
        </div>
      </form>
    </div>
  );
}
