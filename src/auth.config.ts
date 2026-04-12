import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe config: no database adapter, no @libsql imports.
// Used by middleware (Edge runtime) to verify JWT session cookies.
export const authConfig = {
  providers: [Google],
  pages: {
    signIn: "/login",
    error: "/login",
  },
} satisfies NextAuthConfig;
