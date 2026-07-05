-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "excursionId" TEXT;

-- CreateTable
CREATE TABLE "Excursion" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "date" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Excursion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Excursion_tripId_idx" ON "Excursion"("tripId");

-- CreateIndex
CREATE INDEX "Activity_excursionId_idx" ON "Activity"("excursionId");

-- AddForeignKey
ALTER TABLE "Excursion" ADD CONSTRAINT "Excursion_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Excursion" ADD CONSTRAINT "Excursion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "Excursion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
