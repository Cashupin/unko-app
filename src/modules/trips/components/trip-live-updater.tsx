"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface TripLiveUpdaterProps {
  tripId: string;
  lastSeenAt: string;
}

export function TripLiveUpdater({ tripId, lastSeenAt }: TripLiveUpdaterProps) {
  const router = useRouter();
  const lastSeenRef = useRef(lastSeenAt);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    function connect() {
      const url = `/api/trips/${tripId}/events?since=${encodeURIComponent(lastSeenRef.current)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e) => {
        if (e.data === "update") {
          lastSeenRef.current = new Date().toISOString();
          router.refresh();
        }
      };
    }

    function disconnect() {
      esRef.current?.close();
      esRef.current = null;
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        connect();
      } else {
        disconnect();
      }
    }

    connect();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [tripId, router]);

  return null;
}
