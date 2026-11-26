CREATE TYPE "source_kind" AS ENUM('vue-i18n');--> statement-breakpoint
CREATE TABLE "project_app_source" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"appId" uuid NOT NULL,
	"sourceId" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_source" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"projectId" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "source_kind" DEFAULT 'vue-i18n'::"source_kind" NOT NULL,
	"pathPattern" text NOT NULL,
	"sourceLanguage" text NOT NULL,
	"languages" text[] NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "project_app_source_unique" ON "project_app_source" ("appId","sourceId");--> statement-breakpoint
CREATE UNIQUE INDEX "project_source_name_unique" ON "project_source" ("projectId","name");--> statement-breakpoint
ALTER TABLE "project_app_source" ADD CONSTRAINT "project_app_source_appId_project_app_id_fkey" FOREIGN KEY ("appId") REFERENCES "project_app"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_app_source" ADD CONSTRAINT "project_app_source_sourceId_project_source_id_fkey" FOREIGN KEY ("sourceId") REFERENCES "project_source"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_source" ADD CONSTRAINT "project_source_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;