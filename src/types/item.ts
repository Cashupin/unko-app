export type CheckSummary = {
  id: string;
  photoUrl: string | null;
  userName: string | null;
};

export type ItemSummary = {
  id: string;
  title: string;
  type: "PLACE" | "FOOD";
  description: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  address: string | null;
  externalUrl: string | null;
  imageUrl: string | null;
  tripId: string;
  createdAt: Date | string;
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count: { checks: number };
  // Vote breakdown (computed from all votes in the query)
  approvals: number;
  rejections: number;
  // The current user's vote, if any
  myVote: "APPROVE" | "REJECT" | null;
  // The current user's check-in, if any
  myCheck: CheckSummary | null;
  // All check-ins (latest 20), for the photo gallery
  checks: CheckSummary[];
};
