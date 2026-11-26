CREATE TYPE "workspace_invitation_status" AS ENUM('pending', 'accepted', 'rejected', 'canceled');--> statement-breakpoint
CREATE TYPE "workspace_role" AS ENUM('owner', 'admin', 'developer', 'writer', 'reviewer', 'viewer');--> statement-breakpoint
CREATE TYPE "draft_status" AS ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'RELEASED', 'WITHDRAWN');--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" text PRIMARY KEY,
	"configId" text DEFAULT 'default' NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"referenceId" text NOT NULL,
	"refillInterval" integer,
	"refillAmount" integer,
	"lastRefillAt" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"rateLimitEnabled" boolean DEFAULT true NOT NULL,
	"rateLimitTimeWindow" integer,
	"rateLimitMax" integer,
	"requestCount" integer DEFAULT 0 NOT NULL,
	"remaining" integer,
	"lastRequest" timestamp with time zone,
	"expiresAt" timestamp with time zone,
	"permissions" text,
	"metadata" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"token" text NOT NULL,
	"userId" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"activeWorkspaceId" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_invitation" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"workspaceId" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "workspace_role" NOT NULL,
	"status" "workspace_invitation_status" DEFAULT 'pending'::"workspace_invitation_status" NOT NULL,
	"inviterId" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_membership" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"workspaceId" uuid NOT NULL,
	"userId" text NOT NULL,
	"role" "workspace_role" DEFAULT 'viewer'::"workspace_role" NOT NULL,
	"languages" text[],
	"expiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_app" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"projectId" uuid NOT NULL,
	"name" text NOT NULL,
	"widget" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"workspaceId" uuid NOT NULL,
	"name" text NOT NULL,
	"repository" text NOT NULL,
	"defaultBranch" text DEFAULT 'main' NOT NULL,
	"sourceLanguage" text NOT NULL,
	"languages" text[] NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"projectId" uuid NOT NULL,
	"textId" text NOT NULL,
	"language" text NOT NULL,
	"value" text NOT NULL,
	"authorId" text NOT NULL,
	"status" "draft_status" DEFAULT 'DRAFT'::"draft_status" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"projectId" uuid NOT NULL,
	"textId" text NOT NULL,
	"language" text NOT NULL,
	"sourceHash" text NOT NULL,
	"targetHash" text NOT NULL,
	"reviewerId" text NOT NULL,
	"selfApproved" boolean DEFAULT false NOT NULL,
	"releasedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" ("email");--> statement-breakpoint
CREATE INDEX "user_created_id_idx" ON "user" ("createdAt","id");--> statement-breakpoint
CREATE INDEX "api_key_key_idx" ON "api_key" ("key");--> statement-breakpoint
CREATE INDEX "api_key_reference_idx" ON "api_key" ("referenceId");--> statement-breakpoint
CREATE INDEX "api_key_config_idx" ON "api_key" ("configId");--> statement-breakpoint
CREATE INDEX "auth_account_user_idx" ON "auth_account" ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_account_provider_account_unique" ON "auth_account" ("providerId","accountId");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" ("token");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" ("userId");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "workspace_invitation_email_idx" ON "workspace_invitation" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_membership_user_unique" ON "workspace_membership" ("workspaceId","userId");--> statement-breakpoint
CREATE INDEX "workspace_membership_user_idx" ON "workspace_membership" ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_slug_unique" ON "workspace" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "project_app_name_unique" ON "project_app" ("projectId","name");--> statement-breakpoint
CREATE UNIQUE INDEX "project_workspace_repository_unique" ON "project" ("workspaceId","repository");--> statement-breakpoint
CREATE INDEX "project_workspace_idx" ON "project" ("workspaceId");--> statement-breakpoint
CREATE INDEX "draft_project_text_idx" ON "draft" ("projectId","textId","language");--> statement-breakpoint
CREATE INDEX "draft_author_status_idx" ON "draft" ("authorId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_text_pair_unique" ON "approval" ("projectId","textId","language","sourceHash","targetHash");--> statement-breakpoint
CREATE INDEX "approval_unreleased_idx" ON "approval" ("projectId","releasedAt");--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_referenceId_user_id_fkey" FOREIGN KEY ("referenceId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_invitation" ADD CONSTRAINT "workspace_invitation_workspaceId_workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_invitation" ADD CONSTRAINT "workspace_invitation_inviterId_user_id_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_membership" ADD CONSTRAINT "workspace_membership_workspaceId_workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_membership" ADD CONSTRAINT "workspace_membership_userId_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_app" ADD CONSTRAINT "project_app_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_workspaceId_workspace_id_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "draft" ADD CONSTRAINT "draft_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "draft" ADD CONSTRAINT "draft_authorId_user_id_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_projectId_project_id_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "approval" ADD CONSTRAINT "approval_reviewerId_user_id_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE CASCADE;