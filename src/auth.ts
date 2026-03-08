import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  callbacks: {
    ...authConfig.callbacks,
    // Override jwt to always resolve the real DB user id (cuid), not the OAuth sub.
    // With JWT strategy + PrismaAdapter, user.id in the jwt callback may be the
    // OAuth provider's sub (e.g. Google sub) rather than the DB-generated cuid,
    // causing FK violations when that id is used as createdById on other models.
    async jwt({ token, user, account }) {
      if (account && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { id: true, status: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.status = dbUser.status;
        }
      }
      return token;
    },
    async signIn({ user, account }) {
      if (account?.provider !== "google") return false;
      if (!user.email) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { status: true },
      });

      // Returning ACTIVE user — allow directly
      if (existingUser?.status === "ACTIVE") return true;

      // ── Bootstrap ────────────────────────────────────────────────────────────
      // If the User table is empty, the first sign-in creates the initial user.
      // All subsequent users require an invitation.
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        try {
          await prisma.user.create({
            data: {
              email: user.email.toLowerCase(),
              name: user.name ?? null,
              image: user.image ?? null,
              status: "ACTIVE",
            },
          });
          return true;
        } catch {
          // Race condition: another user was created between count and create.
          // Fall through to the invitation check.
        }
      }

      // ── Invitation gate ───────────────────────────────────────────────────────
      const invitation = await prisma.invitation.findFirst({
        where: {
          email: user.email.toLowerCase(),
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        select: { id: true, tripId: true, tripRole: true },
      });

      if (!invitation) return false;

      // Accept the invitation and activate the user atomically
      await prisma.$transaction(async (tx) => {
        const activatedUser = await tx.user.upsert({
          where: { email: user.email!.toLowerCase() },
          create: {
            email: user.email!.toLowerCase(),
            name: user.name ?? null,
            image: user.image ?? null,
            status: "ACTIVE",
          },
          update: { status: "ACTIVE" },
        });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            acceptedById: activatedUser.id,
          },
        });

        // If this was a trip invitation, auto-join the trip
        if (invitation.tripId) {
          const alreadyMember = await tx.tripParticipant.findFirst({
            where: { tripId: invitation.tripId, userId: activatedUser.id },
            select: { id: true },
          });
          if (!alreadyMember) {
            await tx.tripParticipant.create({
              data: {
                tripId: invitation.tripId,
                userId: activatedUser.id,
                name: activatedUser.name ?? user.email!.toLowerCase(),
                type: "REGISTERED",
                role: invitation.tripRole,
              },
            });
          }
        }
      });

      return true;
    },
  },
});
