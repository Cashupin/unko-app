-- CreateEnum
CREATE TYPE "WishlistRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'WISHLIST_REQUEST';

-- DropForeignKey
ALTER TABLE "WishlistItem" DROP CONSTRAINT "WishlistItem_ownedByParticipantId_fkey";

-- AlterTable
ALTER TABLE "WishlistItem" ADD COLUMN     "friendLinkId" TEXT,
ADD COLUMN     "requestStatus" "WishlistRequestStatus",
ALTER COLUMN "ownedByParticipantId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "WishlistFriendLink" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "friendName" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdByParticipantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "WishlistFriendLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WishlistFriendLink_token_key" ON "WishlistFriendLink"("token");

-- CreateIndex
CREATE INDEX "WishlistFriendLink_tripId_idx" ON "WishlistFriendLink"("tripId");

-- CreateIndex
CREATE INDEX "WishlistFriendLink_token_idx" ON "WishlistFriendLink"("token");

-- CreateIndex
CREATE INDEX "WishlistItem_friendLinkId_idx" ON "WishlistItem"("friendLinkId");

-- AddForeignKey
ALTER TABLE "WishlistFriendLink" ADD CONSTRAINT "WishlistFriendLink_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistFriendLink" ADD CONSTRAINT "WishlistFriendLink_createdByParticipantId_fkey" FOREIGN KEY ("createdByParticipantId") REFERENCES "TripParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_ownedByParticipantId_fkey" FOREIGN KEY ("ownedByParticipantId") REFERENCES "TripParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_friendLinkId_fkey" FOREIGN KEY ("friendLinkId") REFERENCES "WishlistFriendLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
