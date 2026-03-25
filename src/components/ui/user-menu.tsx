"use client";

import { useState } from "react";
import Image from "next/image";
import { CurrencySelector } from "@/components/ui/currency-selector";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Props = {
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  signOutSlot: React.ReactNode;
};

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? "Usuario"}
        width={32}
        height={32}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-300">
      {initials}
    </div>
  );
}

export function UserMenu({ userName, userEmail, userImage, signOutSlot }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative hidden md:block">
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-20 flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
      >
        <Avatar name={userName} image={userImage} />
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-zinc-400" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-60 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {userName ?? "Usuario"}
            </p>
            {userEmail && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                {userEmail}
              </p>
            )}
          </div>

          {/* Preferences */}
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700 flex flex-col gap-1">
            <div className="flex flex-col gap-1 rounded-lg px-2 py-1.5">
              <span className="text-xs text-zinc-400 dark:text-zinc-500">Moneda</span>
              <CurrencySelector />
            </div>
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Tema</span>
              <ThemeToggle />
            </div>
          </div>

          {/* Sign out */}
          <div className="px-3 py-2" onClick={() => setOpen(false)}>
            {signOutSlot}
          </div>
        </div>
      )}
    </div>
  );
}
