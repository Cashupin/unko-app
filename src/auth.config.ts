import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-compatible auth config.
 * No Node.js imports allowed here (no prisma, no pg, no fs, etc.)
 * Used by middleware.ts to read JWT without touching the DB.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      // Safe because: only Google is supported, users only exist via invitation
      // or bootstrap — no password auth that could conflict.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // user.status comes from the DB via adapter on first sign-in
        token.status = (user as { status?: string }).status;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.status = token.status as string;
      return session;
    },
  },
};
