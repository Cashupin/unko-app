"use client";

import { useEffect, useRef } from "react";

/**
 * Intercepts the browser back button to close a bottom sheet instead of
 * navigating to the previous page.
 *
 * Use when the sheet mounts/unmounts conditionally ({open && <Sheet />}).
 * Call at the top of the sheet component passing the onClose callback.
 */
export function useSheetHistory(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    history.pushState({ sheet: true }, "");

    let closedByBack = false;
    const handlePopState = () => { closedByBack = true; onCloseRef.current(); };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Cerrado por botón/backdrop: neutralizamos la entrada falsa sin navegar.
      // replaceState actualiza el estado de la entrada actual sin disparar navegación,
      // así no compite con el router de Next.js.
      if (!closedByBack && history.state?.sheet) history.replaceState(null, "");
    };
  }, []);
}

/**
 * Variant for sheets always mounted, shown/hidden via CSS (translate-y-full etc).
 * Call in the component that owns the open state, passing the boolean and setter.
 */
export function useSheetHistoryOpen(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;

    history.pushState({ sheet: true }, "");

    let closedByBack = false;
    const handlePopState = () => { closedByBack = true; onCloseRef.current(); };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // replaceState en vez de back(): no navega, no interfiere con los Links
      // internos del sheet. Si Next.js ya hizo push (navegación a otra página),
      // history.state?.sheet será falso y no tocamos nada.
      if (!closedByBack && history.state?.sheet) history.replaceState(null, "");
    };
  }, [open]);
}
