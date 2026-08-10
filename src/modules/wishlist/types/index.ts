export type WishlistParticipant = {
  id: string;
  name: string;
};

export type WishlistItem = {
  id: string;
  tripId: string;
  name: string;
  notes: string | null;
  imageUrl: string | null;
  bought: boolean;
  boughtAt: string | null;
  createdAt: string;
  ownedByParticipantId: string;
  ownedByParticipant: WishlistParticipant;
};
