-- AlterTable
ALTER TABLE "PasswordResetOTP" ALTER COLUMN "expires_at" SET DEFAULT (now() + interval '10 minutes');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "profile_image_url" VARCHAR(500);
