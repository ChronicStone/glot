CREATE TYPE "release_status" AS ENUM('OPEN', 'MERGED');--> statement-breakpoint
CREATE TYPE "release_trigger" AS ENUM('MANUAL', 'SCHEDULED');--> statement-breakpoint
CREATE TYPE "job_kind" AS ENUM('RELEASE');--> statement-breakpoint
CREATE TYPE "job_status" AS ENUM('PENDING', 'RUNNING', 'DONE', 'FAILED');--> statement-breakpoint
ALTER TYPE "draft_status" ADD VALUE 'CONFLICT' BEFORE 'RELEASED';--> statement-breakpoint
CREATE TABLE "release_change" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"releaseId" uuid NOT NULL,
	"draftId" uuid,
	"textId" text NOT NULL,
	"language" text NOT NULL,
	"previousValue" text,
	"value" text NOT NULL,
	"authorId" text,
	"undoDraftId" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"projectId" uuid NOT NULL,
	"status" "release_status" DEFAULT 'OPEN'::"release_status" NOT NULL,
	"trigger" "release_trigger" NOT NULL,
	"startedById" text,
	"branch" text NOT NULL,
	"baseCommit" text NOT NULL,
	"commit" text NOT NULL,
	"pullRequestNumber" integer,
	"pullRequestUrl" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"mergedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"kind" "job_kind" NOT NULL,
	"projectId" uuid NOT NULL,
	"runAt" timestamp with time zone NOT NULL,
	"status" "job_status" DEFAULT 'PENDING'::"job_status" NOT NULL,
	"startedAt" timestamp with time zone,
	"finishedAt" timestamp with time zone,
	"error" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "draft" ADD COLUMN "baseSourceHash" text;--> statement-breakpoint
ALTER TABLE "draft" ADD COLUMN "baseTargetHash" text;--> statement-breakpoint
ALTER TABLE "approval" ADD COLUMN "releaseId" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "release_change_text_unique" ON "release_change" ("releaseId","textId","language");--> statement-breakpoint
CREATE UNIQUE INDEX "release_open_unique" ON "release" ("projectId") WHERE status = 'OPEN';--> statement-breakpoint
CREATE INDEX "release_project_created_idx" ON "release" ("projectId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "job_slot_unique" ON "job" ("kind","projectId","runAt");--> statement-breakpoint
CREATE INDEX "job_due_idx" ON "job" ("status","runAt");--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_releaseId_release_id_fkey" FOREIGN KEY ("releaseId") REFERENCES "release"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "release_change" ADD CONSTRAINT "release_change_releaseId_release_id_fkey" FOREIGN KEY ("releaseId") REFERENCES "release"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "release_change" ADD CONSTRAINT "release_change_draftId_draft_id_fkey" FOREIGN KEY ("draftId") REFERENCES "draft"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "release_change" ADD CONSTRAINT "release_change_authorId_user_id_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "release_change" ADD CONSTRAINT "release_change_undoDraftId_draft_id_fkey" FOREIGN KEY ("undoDraftId") REFERENCES "draft"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "release" ADD CONSTRAINT "release_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "release" ADD CONSTRAINT "release_startedById_user_id_fkey" FOREIGN KEY ("startedById") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;