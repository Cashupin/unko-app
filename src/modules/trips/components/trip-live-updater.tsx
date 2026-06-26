"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface TripLiveUpdaterProps {
  tripId: string;
}

const MIN_REFRESH_INTERVAL_MS = 2000;

export function TripLiveUpdater({ tripId }: TripLiveUpdaterProps) {
  const router = useRouter();
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    const channel = supabase
      .channel(`trip:${tripId}`)
      .on("broadcast", { event: "update" }, () => {
        // Throttle: if a dev-mode HMR remount ever leaves a stray duplicate
        // subscription alive momentarily, this stops it from cascading into
        // a refresh storm. Harmless in normal use — real updates are never
        // this frequent.
        const now = Date.now();
        if (now - lastRefreshAt.current < MIN_REFRESH_INTERVAL_MS) return;
        lastRefreshAt.current = now;
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  return null;
}
