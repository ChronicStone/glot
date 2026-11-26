CREATE TYPE "comment_kind" AS ENUM('COMMENT', 'CHANGE_REQUEST');--> statement-breakpoint
CREATE TABLE "comment" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"projectId" uuid NOT NULL,
	"textId" text NOT NULL,
	"language" text NOT NULL,
	"authorId" text NOT NULL,
	"kind" "comment_kind" DEFAULT 'COMMENT'::"comment_kind" NOT NULL,
	"body" text NOT NULL,
	"targetHash" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "draft_active_unique" ON "draft" ("projectId","textId","language","authorId") WHERE status in ('DRAFT', 'IN_REVIEW');--> statement-breakpoint
CREATE INDEX "comment_text_idx" ON "comment" ("projectId","textId","language");--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_authorId_user_id_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE;