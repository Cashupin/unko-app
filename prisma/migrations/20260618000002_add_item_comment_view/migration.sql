-- CreateTable
CREATE TABLE "ItemCommentView" (
    "id" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "ItemCommentView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemCommentView_userId_itemId_key" ON "ItemCommentView"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "ItemCommentView" ADD CONSTRAINT "ItemCommentView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCommentView" ADD CONSTRAINT "ItemCommentView_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
