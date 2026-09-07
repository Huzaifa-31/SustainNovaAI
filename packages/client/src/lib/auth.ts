import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
          const data = await res.json();

          if (data?.success && data?.data?.token) {
            return {
              id: data.data.user._id,
              name: data.data.user.name,
              email: data.data.user.email,
              token: data.data.token,
              role: data.data.user.role,
              organizationId: data.data.user.organizationId ?? "",
            };
          }
          return null;
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as unknown as { token: string }).token;
        token.role = (user as unknown as { role: string }).role;
        token.organizationId = (user as unknown as { organizationId: string }).organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      const user = session.user;
      if (user) {
        (user as unknown as { id: string }).id = (token.sub as string) ?? "";
        (user as unknown as { role: string }).role = (token.role as string) ?? "";
        (user as unknown as { organizationId: string }).organizationId = (token.organizationId as string) ?? "";
      }
      (session as unknown as { accessToken: string }).accessToken = (token.accessToken as string) ?? "";
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const isAppRoute = [
        "/dashboard",
        "/audits",
        "/organizations",
        "/factories",
        "/notifications",
        "/findings",
        "/caps",
        "/reports",
        "/assistant",
        "/suppliers",
        "/settings",
        "/help",
      ].some((path) => nextUrl.pathname.startsWith(path));

      if (isAppRoute) {
        if (!isLoggedIn) return false;
        if (role !== "admin" && role !== "organization") return false;
        return true;
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
});
