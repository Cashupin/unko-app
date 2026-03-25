export type TripSummary = {
  id: string;
  name: string;
  description: string | null;
  destination: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  defaultCurrency: string;
  coverImageUrl: string | null;
  createdAt: Date | string;
  createdBy: { id: string; name: string | null; image: string | null };
  _count: { participants: number; items: number };
  myRole: "ADMIN" | "EDITOR" | "VIEWER";
};

export type ParticipantSummary = {
  id: string;
  name: string;
  type: "REGISTERED" | "GHOST";
  role: "ADMIN" | "EDITOR" | "VIEWER";
  joinedAt: Date | string;
  user: { id: string; name: string | null; image: string | null; email: string } | null;
};
