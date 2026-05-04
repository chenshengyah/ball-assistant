-- Activity venue/court snapshots no longer require Venue/VenueCourt master data.
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "Activity_venueId_fkey";
ALTER TABLE "ActivityCourt" DROP CONSTRAINT IF EXISTS "ActivityCourt_venueCourtId_fkey";

ALTER TABLE "Activity"
  ADD COLUMN "venueSnapshotAddress" TEXT,
  ADD COLUMN "venueSnapshotProvince" TEXT,
  ADD COLUMN "venueSnapshotCity" TEXT,
  ADD COLUMN "venueSnapshotDistrict" TEXT,
  ADD COLUMN "venueSnapshotLatitude" DOUBLE PRECISION,
  ADD COLUMN "venueSnapshotLongitude" DOUBLE PRECISION;

ALTER TABLE "Activity" ALTER COLUMN "venueId" DROP NOT NULL;
ALTER TABLE "ActivityCourt" ALTER COLUMN "venueCourtId" DROP NOT NULL;
