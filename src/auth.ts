import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    // Auth.js v5 automatically reads AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET
    Google(),
  ],
  callbacks: {
    async signIn({ user }) {
      if (allowedEmails.length === 0) return false;
      return allowedEmails.includes(user.email?.toLowerCase() ?? "");
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Pull preferMetric from DB
        const dbUser = await db.user.findUnique({ where: { id: user.id } });
        (session.user as typeof session.user & { preferMetric: boolean }).preferMetric =
          dbUser?.preferMetric ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
