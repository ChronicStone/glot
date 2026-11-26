ALTER TABLE "release" ADD COLUMN "changeCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "release" ADD COLUMN "approvalCount" integer DEFAULT 0 NOT NULL;