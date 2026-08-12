"use client";

import { useState } from "react";
import { EncargosManagementPanel } from "./encargos-management-panel";
import { EncargosGrid } from "./encargos-grid";
import type { WishlistFriendLink, FriendRequest } from "../types";

type Props = {
  tripId: string;
  initialLinks: WishlistFriendLink[];
  initialRequests: FriendRequest[];
};

export function EncargosSubtabClient({ tripId, initialLinks, initialRequests }: Props) {
  const [requests, setRequests] = useState<FriendRequest[]>(initialRequests);

  function updateRequest(id: string, changes: Partial<FriendRequest>) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, ...changes } : r));
  }

  const pending  = requests.filter((r) => r.requestStatus === "PENDING");
  const approved = requests.filter((r) => r.requestStatus === "APPROVED");

  return (
    <div className="flex flex-col gap-6 pt-2">
      <EncargosManagementPanel
        tripId={tripId}
        initialLinks={initialLinks}
        pendingRequests={pending}
        onRequestUpdate={updateRequest}
      />
      <EncargosGrid
        tripId={tripId}
        requests={approved}
        onUpdate={updateRequest}
      />
    </div>
  );
}
