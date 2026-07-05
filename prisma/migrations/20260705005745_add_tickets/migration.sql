-- CreateEnum
CREATE TYPE "TicketScope" AS ENUM ('GROUP', 'INDIVIDUAL');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" "TicketScope" NOT NULL DEFAULT 'GROUP',
    "visitDate" TEXT,
    "buyFrom" TEXT,
    "buyDeadline" TEXT,
    "price" DOUBLE PRECISION,
    "currency" "Currency" NOT NULL DEFAULT 'JPY',
    "link" TEXT,
    "notes" TEXT,
    "isPurchased" BOOLEAN NOT NULL DEFAULT false,
    "purchasedById" TEXT,
    "activityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_tripId_idx" ON "Ticket"("tripId");

-- CreateIndex
CREATE INDEX "Ticket_buyDeadline_idx" ON "Ticket"("buyDeadline");

-- CreateIndex
CREATE INDEX "Ticket_activityId_idx" ON "Ticket"("activityId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "TripParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
