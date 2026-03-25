"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface TripLiveUpdaterProps {
  tripId: string;
}

export function TripLiveUpdater({ tripId }: TripLiveUpdaterProps) {
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel(`trip:${tripId}`)
      .on("broadcast", { event: "update" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  return null;
}
