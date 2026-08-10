"use client";

import { useEffect, useRef } from "react";

/**
 * Intercepts the browser back button to close a bottom sheet instead of
 * navigating to the previous page.
 *
 * Use this when the sheet component mounts/unmounts (conditional render).
 * Call at the top of the sheet component passing the onClose callback.
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

/**
 * Variant for sheets that are always mounted and shown/hidden via CSS
 * (e.g. translate-y-full / translate-y-0). Reacts to an `open` boolean.
 */
export function useSheetHistoryOpen(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;

    history.pushState({ sheet: true }, "");

    const handlePopState = () => onCloseRef.current();
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (history.state?.sheet) history.back();
    };
  }, [open]);
}
