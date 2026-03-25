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

  useEffect(() => {
    const url = `/api/trips/${tripId}/events?since=${encodeURIComponent(lastSeenRef.current)}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      if (e.data === "update") {
        lastSeenRef.current = new Date().toISOString();
        router.refresh();
      }
    };

    return () => {
      es.close();
    };
  }, [tripId, router]);

  return null;
}
