-- AlterTable
ALTER TABLE "ExpenseItem" ADD COLUMN     "groupKey" TEXT,
ADD COLUMN     "groupQty" INTEGER,
ADD COLUMN     "itemQty" INTEGER;

-- CreateIndex
CREATE INDEX "ExpenseItem_groupKey_idx" ON "ExpenseItem"("groupKey");
