"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  FileText,
  GitCompare,
  Search,
  ClipboardCheck,
  Building2,
  Factory,
  BarChart3,
  Sparkles,
  Settings,
  HelpCircle,
  ChevronDown,
  Plus,
  LogOut,
  User,
} from "lucide-react";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";

const adminSidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/factories", label: "Factories", icon: Factory },
];

const orgSidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/audits", label: "Analyses", icon: FileText },
  { href: "/factories", label: "Factories", icon: Factory },
  { href: "/audits/compare", label: "Compare Reports", icon: GitCompare },
  { href: "/findings", label: "Findings", icon: Search },
  { href: "/caps", label: "Corrective Actions", icon: ClipboardCheck },
  { href: "/suppliers", label: "Suppliers / Sites", icon: Building2 },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Welcome back" },
  "/audits": { title: "Analyses", subtitle: "Manage your audits" },
  "/organizations": { title: "Organizations", subtitle: "Manage organizations" },
  "/notifications": { title: "Notifications", subtitle: "Stay updated" },
};

function getPageTitle(pathname: string) {
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return title;
  }
  return { title: "SustainNova AI", subtitle: "AI Audit Intelligence" };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const userName = session?.user?.name ?? "Team Admin";
  const pageTitle = getPageTitle(pathname);
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const role = session?.user?.role;
  const sidebarItems = role === "admin" ? adminSidebarItems : orgSidebarItems;

  return (
    <div className="flex min-h-screen bg-[#f4f6f8]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[#0a1628] text-white">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <span className="text-lg font-bold text-white">S</span>
          </div>
          <div>
            <p className="text-base font-bold leading-tight">SustainNova</p>
            <p className="text-[10px] text-gray-400">AI Audit Intelligence</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="my-4 border-t border-white/10" />

          <div className="space-y-1">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* AI Assistant Promo */}
        <div className="mx-4 mb-4 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#0f2444] p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Sparkles className="h-4 w-4 text-blue-300" />
            </div>
            <div>
              <p className="text-sm font-semibold">SustainNova AI</p>
            </div>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-gray-300">
            Your AI-powered audit intelligence and insights.
          </p>
          <Link
            href="/assistant"
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#0a1628] hover:bg-gray-100"
          >
            Ask AI Assistant
            <span>→</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-64 flex flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-8 py-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{pageTitle.title}</h1>
            <p className="text-sm text-gray-500">{pageTitle.subtitle}, {userName}!</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/audits/new"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Analysis
            </Link>
            <NotificationBell />
            <UserMenu userName={userName} initials={initials} />
          </div>
        </header>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

function UserMenu({ userName, initials }: { userName: string; initials: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-3 py-1.5 transition hover:bg-gray-50"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
          {initials}
        </div>
        <span className="text-sm font-medium text-gray-700">{userName}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <User className="h-4 w-4" />
            Settings
          </Link>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationBell() {
  const { data: count = 0 } = useUnreadNotificationCount();

  return (
    <Link href="/notifications" className="relative rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
