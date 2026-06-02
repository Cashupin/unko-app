-- CreateTable
CREATE TABLE "PersonalActivity" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "time" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalActivity_tripId_userId_idx" ON "PersonalActivity"("tripId", "userId");

-- CreateIndex
CREATE INDEX "PersonalActivity_date_idx" ON "PersonalActivity"("date");

-- AddForeignKey
ALTER TABLE "PersonalActivity" ADD CONSTRAINT "PersonalActivity_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalActivity" ADD CONSTRAINT "PersonalActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
