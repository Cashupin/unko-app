-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "tripId" TEXT,
ADD COLUMN     "tripRole" "TripRole" NOT NULL DEFAULT 'VIEWER';

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
