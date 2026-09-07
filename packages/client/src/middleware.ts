export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Protect all app routes
    "/dashboard/:path*",
    "/audits/:path*",
    "/organizations/:path*",
    "/factories/:path*",
    "/notifications/:path*",
    "/findings/:path*",
    "/caps/:path*",
    "/reports/:path*",
    "/assistant/:path*",
    "/suppliers/:path*",
    "/settings/:path*",
    "/help/:path*",
  ],
};
