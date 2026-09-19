// Full Tailwind class strings — needed for purge to include them in the build
export const SECTION_COLORS = [
  {
    key: "blue",
    swatch: "bg-blue-400 dark:bg-blue-500",
    headerBorder: "border-blue-400 dark:border-blue-500",
    headerBg: "bg-blue-50/80 dark:bg-blue-950/25",
    itemsBorder: "border-blue-200 dark:border-blue-800/70",
  },
  {
    key: "violet",
    swatch: "bg-violet-400 dark:bg-violet-500",
    headerBorder: "border-violet-400 dark:border-violet-500",
    headerBg: "bg-violet-50/80 dark:bg-violet-950/25",
    itemsBorder: "border-violet-200 dark:border-violet-800/70",
  },
  {
    key: "amber",
    swatch: "bg-amber-400 dark:bg-amber-500",
    headerBorder: "border-amber-400 dark:border-amber-500",
    headerBg: "bg-amber-50/80 dark:bg-amber-950/25",
    itemsBorder: "border-amber-200 dark:border-amber-800/70",
  },
  {
    key: "emerald",
    swatch: "bg-emerald-400 dark:bg-emerald-500",
    headerBorder: "border-emerald-400 dark:border-emerald-500",
    headerBg: "bg-emerald-50/80 dark:bg-emerald-950/25",
    itemsBorder: "border-emerald-200 dark:border-emerald-800/70",
  },
  {
    key: "rose",
    swatch: "bg-rose-400 dark:bg-rose-500",
    headerBorder: "border-rose-400 dark:border-rose-500",
    headerBg: "bg-rose-50/80 dark:bg-rose-950/25",
    itemsBorder: "border-rose-200 dark:border-rose-800/70",
  },
  {
    key: "cyan",
    swatch: "bg-cyan-400 dark:bg-cyan-500",
    headerBorder: "border-cyan-400 dark:border-cyan-500",
    headerBg: "bg-cyan-50/80 dark:bg-cyan-950/25",
    itemsBorder: "border-cyan-200 dark:border-cyan-800/70",
  },
  {
    key: "orange",
    swatch: "bg-orange-400 dark:bg-orange-500",
    headerBorder: "border-orange-400 dark:border-orange-500",
    headerBg: "bg-orange-50/80 dark:bg-orange-950/25",
    itemsBorder: "border-orange-200 dark:border-orange-800/70",
  },
  {
    key: "pink",
    swatch: "bg-pink-400 dark:bg-pink-500",
    headerBorder: "border-pink-400 dark:border-pink-500",
    headerBg: "bg-pink-50/80 dark:bg-pink-950/25",
    itemsBorder: "border-pink-200 dark:border-pink-800/70",
  },
] as const;

export type SectionColor = (typeof SECTION_COLORS)[number];
