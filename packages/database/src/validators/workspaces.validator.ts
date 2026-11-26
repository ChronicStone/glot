import { createSelectSchema } from 'drizzle-orm/zod'
import { workspaceRoleEnum, workspaces } from '../schemas/workspaces/workspaces.schema.ts'

export const workspaceSelectSchema = createSelectSchema(workspaces)
export const workspaceRoleSchema = createSelectSchema(workspaceRoleEnum)
