DROP INDEX "project_workspace_repository_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_repository_unique" ON "project" (lower("repository"));