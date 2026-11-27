import { defineRelations } from 'drizzle-orm'
import * as schema from './index.ts'
import { aiRelationsPart } from './ai/ai.relations.ts'
import { approvalsRelationsPart } from './approvals/approvals.relations.ts'
import { commentsRelationsPart } from './comments/comments.relations.ts'
import { draftsRelationsPart } from './drafts/drafts.relations.ts'
import { glossaryRelationsPart } from './glossary/glossary.relations.ts'
import { projectsRelationsPart } from './projects/projects.relations.ts'
import { releasesRelationsPart } from './releases/releases.relations.ts'
import { usersRelationsPart } from './users/users.relations.ts'
import { workspacesRelationsPart } from './workspaces/workspaces.relations.ts'

export const relations = {
  ...defineRelations(schema),
  ...usersRelationsPart,
  ...workspacesRelationsPart,
  ...projectsRelationsPart,
  ...draftsRelationsPart,
  ...approvalsRelationsPart,
  ...commentsRelationsPart,
  ...releasesRelationsPart,
  ...glossaryRelationsPart,
  ...aiRelationsPart,
}
