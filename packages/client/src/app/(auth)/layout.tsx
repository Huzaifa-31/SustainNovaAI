import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-gray-900">
          SustainNova AI
        </Link>
      </header>
      {children}
    </div>
  );
}
