"use client";

import { useEffect, useRef } from "react";

/**
 * Intercepts the browser back button to close a bottom sheet instead of
 * navigating to the previous page. Standard pattern for mobile web apps.
 *
 * Usage: call inside any bottom sheet component, passing the onClose callback.
 */
export function useSheetHistory(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    history.pushState({ sheet: true }, "");

    const handlePopState = () => onCloseRef.current();
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Sheet closed via button/backdrop (not back) → clean up the fake entry
      if (history.state?.sheet) history.back();
    };
  }, []);
}
