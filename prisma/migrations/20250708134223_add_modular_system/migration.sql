-- AlterTable
ALTER TABLE "User" ADD COLUMN     "appProfile" TEXT,
ADD COLUMN     "moduleSettings" JSONB,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0;
