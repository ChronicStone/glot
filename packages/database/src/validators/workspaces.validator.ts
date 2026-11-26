import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod'
import * as z from 'zod'
import { WORKSPACE_ROLES } from '../constants/workspaces.constants.ts'
import { workspaceMemberships, workspaces } from '../schemas/workspaces/workspaces.schema.ts'

export const workspaceSelectSchema = createSelectSchema(workspaces)
export const workspaceRoleSchema = z.enum(WORKSPACE_ROLES)

export const workspaceMembershipSelectSchema = createSelectSchema(workspaceMemberships, {
  role: workspaceRoleSchema,
})

export const workspaceMembershipInsertSchema = createInsertSchema(workspaceMemberships, {
  role: workspaceRoleSchema,
})
