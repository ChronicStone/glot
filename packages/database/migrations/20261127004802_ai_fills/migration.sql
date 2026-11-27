CREATE TYPE "ai_fill_stop_reason" AS ENUM('BUDGET_REACHED', 'NO_KEY', 'PROVIDER_ERROR', 'TEXTS_REJECTED');--> statement-breakpoint
CREATE TYPE "ai_provider" AS ENUM('ANTHROPIC', 'OPENAI');--> statement-breakpoint
CREATE TYPE "ai_usage_kind" AS ENUM('SUGGEST', 'FILL');--> statement-breakpoint
ALTER TYPE "job_kind" ADD VALUE 'AI_FILL';--> statement-breakpoint
CREATE TABLE "ai_fill" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"jobId" uuid NOT NULL,
	"projectId" uuid NOT NULL,
	"language" text NOT NULL,
	"requestedById" text NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"filled" integer DEFAULT 0 NOT NULL,
	"rejected" integer DEFAULT 0 NOT NULL,
	"stopReason" "ai_fill_stop_reason",
	"stopMessage" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_key" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"workspaceId" uuid NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"ciphertext" text NOT NULL,
	"last4" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"workspaceId" uuid NOT NULL,
	"provider" "ai_provider" DEFAULT 'ANTHROPIC'::"ai_provider" NOT NULL,
	"model" text DEFAULT 'claude-sonnet-5-5' NOT NULL,
	"monthlyBudgetMicros" bigint DEFAULT 10000000 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"workspaceId" uuid NOT NULL,
	"projectId" uuid NOT NULL,
	"userId" text NOT NULL,
	"language" text NOT NULL,
	"kind" "ai_usage_kind" NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" text NOT NULL,
	"inputTokens" integer NOT NULL,
	"outputTokens" integer NOT NULL,
	"costMicros" bigint NOT NULL,
	"texts" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "draft" ADD COLUMN "aiWritten" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_fill_job_unique" ON "ai_fill" ("jobId");--> statement-breakpoint
CREATE INDEX "ai_fill_project_idx" ON "ai_fill" ("projectId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_key_workspace_provider_unique" ON "ai_key" ("workspaceId","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_settings_workspace_unique" ON "ai_settings" ("workspaceId");--> statement-breakpoint
CREATE INDEX "ai_usage_workspace_month_idx" ON "ai_usage" ("workspaceId","createdAt");--> statement-breakpoint
ALTER TABLE "ai_fill" ADD CONSTRAINT "ai_fill_jobId_job_id_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_fill" ADD CONSTRAINT "ai_fill_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_fill" ADD CONSTRAINT "ai_fill_requestedById_user_id_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_key" ADD CONSTRAINT "ai_key_workspaceId_workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_workspaceId_workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_workspaceId_workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;