-- DropForeignKey
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_itemId_fkey";

-- DropForeignKey
ALTER TABLE "Check" DROP CONSTRAINT "Check_itemId_fkey";

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
