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
  originItemId: string | null;
  createdAt: string;
  ownedByParticipantId: string;
  ownedByParticipant: WishlistParticipant;
};

// Grupo de items que comparten el mismo root (original + copias)
export type WishlistGroup = {
  rootId: string;       // id del item original
  root: WishlistItem;   // item original (para mostrar foto/nombre)
  all: WishlistItem[];  // todos los que lo quieren (incluyendo el original)
};
