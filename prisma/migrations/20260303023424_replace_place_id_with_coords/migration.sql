/*
  Warnings:

  - You are about to drop the column `locationPlaceId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `locationPlaceId` on the `Item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "locationPlaceId",
ADD COLUMN     "locationLat" DOUBLE PRECISION,
ADD COLUMN     "locationLng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "locationPlaceId",
ADD COLUMN     "locationLat" DOUBLE PRECISION,
ADD COLUMN     "locationLng" DOUBLE PRECISION;
