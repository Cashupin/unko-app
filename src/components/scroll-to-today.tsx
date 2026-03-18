"use client";

import { useEffect } from "react";

export function ScrollToToday() {
  useEffect(() => {
    const el = document.getElementById("today-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return null;
}
