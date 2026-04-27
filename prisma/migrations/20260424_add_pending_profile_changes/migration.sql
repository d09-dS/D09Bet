-- CreateEnum
CREATE TYPE "ProfileChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_CHANGE_REQUESTED';

-- CreateTable
CREATE TABLE "pending_profile_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "changes" JSONB NOT NULL,
    "status" "ProfileChangeStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_profile_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_profile_changes_status_idx" ON "pending_profile_changes"("status");
CREATE INDEX "pending_profile_changes_user_id_idx" ON "pending_profile_changes"("user_id");

-- AddForeignKey
ALTER TABLE "pending_profile_changes" ADD CONSTRAINT "pending_profile_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pending_profile_changes" ADD CONSTRAINT "pending_profile_changes_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
