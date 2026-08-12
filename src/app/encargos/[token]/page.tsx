import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EncargoPageClient } from "@/modules/encargos/components/encargo-page-client";

export default async function EncargoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const link = await prisma.wishlistFriendLink.findUnique({
    where: { token },
    select: {
      id: true,
      friendName: true,
      revokedAt: true,
      trip: { select: { id: true, name: true, destination: true } },
      requests: {
        select: {
          id: true,
          name: true,
          notes: true,
          imageUrl: true,
          requestStatus: true,
          bought: true,
          cost: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!link || link.revokedAt) notFound();

  return (
    <EncargoPageClient
      token={token}
      friendName={link.friendName}
      trip={link.trip}
      initialRequests={link.requests.map((r) => ({
        ...r,
        requestStatus: r.requestStatus as "PENDING" | "APPROVED" | "REJECTED",
        bought: r.bought,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
