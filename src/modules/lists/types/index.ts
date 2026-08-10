export type ListVisibility = "PRIVATE" | "TRIP" | "COLLABORATIVE";

export type ListItemParticipant = {
  id: string;
  name: string;
};

export type ListItem = {
  id: string;
  listId: string;
  sectionId: string | null;
  text: string;
  notes: string | null;
  checked: boolean;
  checkedAt: string | null;
  order: number;
  checkedByParticipant: ListItemParticipant | null;
};

export type ListSection = {
  id: string;
  title: string;
  order: number;
  items: ListItem[];
};

export type ShoppingList = {
  id: string;
  title: string;
  emoji: string | null;
  visibility: ListVisibility;
  order: number;
  createdByParticipant: ListItemParticipant;
  sections: ListSection[];
  items: ListItem[]; // ítems directos (sin sección)
};
