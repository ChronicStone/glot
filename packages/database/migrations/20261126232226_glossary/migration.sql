CREATE TYPE "glossary_term_status" AS ENUM('SUGGESTED', 'VALIDATED', 'TURNED_DOWN');--> statement-breakpoint
CREATE TABLE "glossary_concept_term" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"conceptId" uuid NOT NULL,
	"language" text NOT NULL,
	"term" text NOT NULL,
	"plural" text,
	"avoid" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glossary_concept" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"workspaceId" uuid NOT NULL,
	"name" text NOT NULL,
	"definition" text DEFAULT '' NOT NULL,
	"status" "glossary_term_status" DEFAULT 'SUGGESTED'::"glossary_term_status" NOT NULL,
	"neverTranslate" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "glossary_concept_term_unique" ON "glossary_concept_term" ("conceptId","language");--> statement-breakpoint
CREATE UNIQUE INDEX "glossary_concept_name_unique" ON "glossary_concept" ("workspaceId",lower("name"));--> statement-breakpoint
CREATE INDEX "glossary_concept_status_idx" ON "glossary_concept" ("workspaceId","status");--> statement-breakpoint
ALTER TABLE "glossary_concept_term" ADD CONSTRAINT "glossary_concept_term_conceptId_glossary_concept_id_fkey" FOREIGN KEY ("conceptId") REFERENCES "glossary_concept"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "glossary_concept" ADD CONSTRAINT "glossary_concept_workspaceId_workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE;