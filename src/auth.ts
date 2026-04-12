import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function resolveSessionUser(token: { sub?: string | null; email?: string | null; name?: string | null; picture?: string | null }) {
  if (token.sub) {
    const existingById = await db.user.findUnique({ where: { id: token.sub } });
    if (existingById) return existingById;
  }

  const email = token.email?.toLowerCase().trim();
  if (!email) return null;

  return db.user.upsert({
    where: { email },
    update: {
      name: token.name ?? undefined,
      image: token.picture ?? undefined,
    },
    create: {
      email,
      name: token.name ?? undefined,
      image: token.picture ?? undefined,
    },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  // JWT strategy: sessions are verified from the cookie in the Edge runtime
  // (middleware) without any database access. DB lookups still happen in
  // server components and API routes when auth() is called there.
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (allowedEmails.length === 0) return false;
      return allowedEmails.includes(user.email?.toLowerCase() ?? "");
    },
    async jwt({ token, user }) {
      // Persist the database user ID into the token on first sign-in
      if (user?.id) {
        token.sub = user.id;
      }

      const resolvedUser = await resolveSessionUser({
        sub: token.sub,
        email: token.email,
        name: token.name,
        picture: token.picture,
      });

      if (resolvedUser) {
        token.sub = resolvedUser.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        // Fetch fresh preferMetric on every session check so settings
        // changes are reflected immediately without re-login.
        const dbUser = await db.user.findUnique({ where: { id: token.sub } });
        (session.user as typeof session.user & { preferMetric: boolean }).preferMetric =
          dbUser?.preferMetric ?? false;
      }
      return session;
    },
  },
});
