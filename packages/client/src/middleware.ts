export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Protect all dashboard routes
    "/audits/:path*",
    "/organizations/:path*",
    "/notifications/:path*",
  ],
};
