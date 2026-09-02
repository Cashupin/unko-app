-- AlterTable
ALTER TABLE "PersonalActivity" ADD COLUMN     "itemId" TEXT,
ALTER COLUMN "date" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "PersonalActivity_itemId_idx" ON "PersonalActivity"("itemId");

-- AddForeignKey
ALTER TABLE "PersonalActivity" ADD CONSTRAINT "PersonalActivity_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
