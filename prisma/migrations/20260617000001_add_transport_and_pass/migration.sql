-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('FLIGHT', 'TRAIN', 'BUS', 'FERRY', 'CAR');

-- CreateTable
CREATE TABLE "Pass" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "currency" "Currency" NOT NULL DEFAULT 'CLP',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transport" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "type" "TransportType" NOT NULL,
    "departureDate" TIMESTAMP(3),
    "departureTime" TEXT,
    "arrivalDate" TIMESTAMP(3),
    "arrivalTime" TEXT,
    "cost" DOUBLE PRECISION,
    "currency" "Currency" NOT NULL DEFAULT 'CLP',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "coveredByPassId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pass_tripId_idx" ON "Pass"("tripId");

-- CreateIndex
CREATE INDEX "Transport_tripId_idx" ON "Transport"("tripId");

-- CreateIndex
CREATE INDEX "Transport_departureDate_idx" ON "Transport"("departureDate");

-- CreateIndex
CREATE INDEX "Transport_coveredByPassId_idx" ON "Transport"("coveredByPassId");

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_coveredByPassId_fkey" FOREIGN KEY ("coveredByPassId") REFERENCES "Pass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
