ALTER TABLE "User"
ADD COLUMN "phoneCountryCode" TEXT,
ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

ALTER TABLE "Club"
ADD COLUMN "contactName" TEXT,
ADD COLUMN "contactPhone" TEXT;

ALTER TABLE "Activity"
ADD COLUMN "ownerDisplayAvatarColor" TEXT,
ADD COLUMN "ownerDisplayAvatarUrl" TEXT,
ADD COLUMN "ownerDisplayContactName" TEXT,
ADD COLUMN "ownerDisplayContactPhone" TEXT,
ADD COLUMN "ownerDisplayLogoUrl" TEXT,
ADD COLUMN "ownerDisplayMode" "OwnerType",
ADD COLUMN "ownerDisplayName" TEXT;
