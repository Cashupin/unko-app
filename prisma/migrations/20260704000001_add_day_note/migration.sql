-- CreateTable
CREATE TABLE "DayNote" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "label" VARCHAR(120) NOT NULL,

    CONSTRAINT "DayNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DayNote_tripId_idx" ON "DayNote"("tripId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "DayNote_tripId_date_key" ON "DayNote"("tripId", "date");

-- AddForeignKey
ALTER TABLE "DayNote" ADD CONSTRAINT "DayNote_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
