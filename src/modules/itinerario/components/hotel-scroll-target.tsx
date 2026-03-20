"use client";

import { useEffect, useRef } from "react";

export function HotelScrollTarget({
  hotelId,
  highlightId,
  children,
}: {
  hotelId: string;
  highlightId: string | null;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isHighlighted = highlightId === hotelId;

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={ref}
      id={`hotel-${hotelId}`}
      className={`transition-all duration-500 ${
        isHighlighted
          ? "ring-2 ring-blue-400 ring-offset-2 rounded-2xl dark:ring-blue-500 dark:ring-offset-zinc-900"
          : ""
      }`}
    >
      {children}
    </div>
  );
}
