import { prisma } from "@/lib/prisma";
import { ListsClient } from "./lists-client";
import type { ShoppingList } from "../types";

type Props = {
  tripId: string;
  myParticipantId: string;
  canEdit: boolean;
};

export async function ListsView({ tripId, myParticipantId, canEdit }: Props) {
  const lists = await prisma.shoppingList.findMany({
    where: {
      tripId,
      OR: [
        { visibility: "TRIP" },
        { visibility: "COLLABORATIVE" },
        { visibility: "PRIVATE", createdByParticipantId: myParticipantId },
      ],
    },
    select: {
      id: true,
      title: true,
      emoji: true,
      visibility: true,
      order: true,
      createdByParticipant: { select: { id: true, name: true } },
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          items: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              listId: true,
              sectionId: true,
              text: true,
              notes: true,
              checked: true,
              checkedAt: true,
              order: true,
              checkedByParticipant: { select: { id: true, name: true } },
            },
          },
        },
      },
      items: {
        where: { sectionId: null },
        orderBy: { order: "asc" },
        select: {
          id: true,
          listId: true,
          sectionId: true,
          text: true,
          notes: true,
          checked: true,
          checkedAt: true,
          order: true,
          checkedByParticipant: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  return (
    <ListsClient
      tripId={tripId}
      myParticipantId={myParticipantId}
      canEdit={canEdit}
      initialLists={lists as ShoppingList[]}
    />
  );
}
