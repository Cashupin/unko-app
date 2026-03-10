import { prisma } from "@/lib/prisma";
import { GalleryClient } from "@/components/gallery-client";

export async function GalleryView({ tripId, tripName }: { tripId: string; tripName: string }) {
  const checks = await prisma.check.findMany({
    where: {
      photoUrl: { not: null },
      item: { tripId },
    },
    select: {
      id: true,
      photoUrl: true,
      createdAt: true,
      user: { select: { name: true } },
      item: { select: { title: true } },
    },
    orderBy: [{ item: { createdAt: "asc" } }, { createdAt: "asc" }],
  });

  const photos = checks.map((c) => ({
    id: c.id,
    url: c.photoUrl!,
    itemTitle: c.item.title,
    userName: c.user?.name ?? null,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Galería
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
            Check-ins con foto
          </p>
        </div>
        {photos.length > 0 && (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
            {photos.length} foto{photos.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white/60 p-14 text-center dark:border-zinc-700 dark:bg-zinc-800/60">
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            No hay fotos de visitas todavía. ¡Haz check-in en un lugar aprobado para agregar la primera!
          </p>
        </div>
      ) : (
        <GalleryClient photos={photos} tripName={tripName} />
      )}
    </div>
  );
}
