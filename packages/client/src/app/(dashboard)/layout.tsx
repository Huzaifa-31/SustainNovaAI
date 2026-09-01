"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "User";

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/audits" className="text-lg font-bold text-gray-900">
              SustainNova AI
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/audits" className="text-gray-600 hover:text-gray-900">
                Audits
              </Link>
              <Link href="/organizations" className="text-gray-600 hover:text-gray-900">
                Organizations
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">{userName}</span>
            <button
              onClick={() => {
                if (typeof window !== "undefined") localStorage.removeItem("auth_token");
                signOut({ callbackUrl: "/login" });
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
