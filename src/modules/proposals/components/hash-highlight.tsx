"use client";

import { useEffect } from "react";

/** Reads window.location.hash on mount and highlights the matching element. */
export function HashHighlight() {
  useEffect(() => {
    const hash = window.location.hash; // e.g. "#item-abc123"
    if (!hash) return;
    const id = hash.slice(1); // strip leading #
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.transition = "box-shadow 0.1s ease-in";
    el.style.boxShadow = "0 0 0 3px rgb(59 130 246 / 0.7), 0 0 0 8px rgb(59 130 246 / 0.15)";
    const timer = setTimeout(() => {
      el.style.transition = "box-shadow 0.8s ease-out";
      el.style.boxShadow = "";
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
