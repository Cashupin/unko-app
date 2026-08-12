import Link from "next/link";

type Props = {
  tripId: string;
  activeSubtab: "wishlist" | "encargos";
};

export function WishlistSubNav({ tripId, activeSubtab }: Props) {
  const tabs = [
    { id: "wishlist" as const, label: "Wishlist", href: `/trips/${tripId}?tab=wishlist` },
    { id: "encargos" as const, label: "Encargos", href: `/trips/${tripId}?tab=wishlist&wishlistSubtab=encargos` },
  ];

  return (
    <div className="mb-5 flex gap-1 border-b border-zinc-100 dark:border-zinc-800">
      {tabs.map((tab) => {
        const active = activeSubtab === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
