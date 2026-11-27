ALTER TYPE "job_kind" ADD VALUE 'DIGEST';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "receivesDigest" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "approval" ADD COLUMN "words" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "userId" text;--> statement-breakpoint
ALTER TABLE "job" ALTER COLUMN "projectId" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "job_person_slot_unique" ON "job" ("kind","userId","runAt");--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_one_subject" CHECK (("projectId" is null) <> ("userId" is null));