-- AlterTable
ALTER TABLE "WishlistItem" ADD COLUMN     "originItemId" TEXT;

-- CreateIndex
CREATE INDEX "WishlistItem_originItemId_idx" ON "WishlistItem"("originItemId");

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_originItemId_fkey" FOREIGN KEY ("originItemId") REFERENCES "WishlistItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
