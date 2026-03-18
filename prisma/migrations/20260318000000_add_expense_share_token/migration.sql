-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Expense_shareToken_key" ON "Expense"("shareToken");
