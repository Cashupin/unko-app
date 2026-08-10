-- CreateEnum
CREATE TYPE "ListVisibility" AS ENUM ('PRIVATE', 'TRIP', 'COLLABORATIVE');

-- CreateTable
CREATE TABLE "ShoppingList" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "emoji" TEXT,
    "visibility" "ListVisibility" NOT NULL DEFAULT 'TRIP',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByParticipantId" TEXT NOT NULL,

    CONSTRAINT "ShoppingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingListSection" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingListSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "sectionId" TEXT,
    "text" TEXT NOT NULL,
    "notes" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "checkedByParticipantId" TEXT,

    CONSTRAINT "ShoppingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShoppingList_tripId_idx" ON "ShoppingList"("tripId");

-- CreateIndex
CREATE INDEX "ShoppingList_createdByParticipantId_idx" ON "ShoppingList"("createdByParticipantId");

-- CreateIndex
CREATE INDEX "ShoppingListSection_listId_idx" ON "ShoppingListSection"("listId");

-- CreateIndex
CREATE INDEX "ShoppingListItem_listId_idx" ON "ShoppingListItem"("listId");

-- CreateIndex
CREATE INDEX "ShoppingListItem_sectionId_idx" ON "ShoppingListItem"("sectionId");

-- CreateIndex
CREATE INDEX "ShoppingListItem_checkedByParticipantId_idx" ON "ShoppingListItem"("checkedByParticipantId");

-- AddForeignKey
ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_createdByParticipantId_fkey" FOREIGN KEY ("createdByParticipantId") REFERENCES "TripParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListSection" ADD CONSTRAINT "ShoppingListSection_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ShoppingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_checkedByParticipantId_fkey" FOREIGN KEY ("checkedByParticipantId") REFERENCES "TripParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ShoppingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ShoppingListSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
