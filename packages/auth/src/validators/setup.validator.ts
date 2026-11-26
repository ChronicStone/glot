import { user } from '@glot/database/schemas'
import { workspaceSelectSchema } from '@glot/database/validators/workspaces'
import { createInsertSchema } from 'drizzle-orm/zod'
import * as z from 'zod'

const userInsertSchema = createInsertSchema(user)

export const setupCompleteSchema = z.object({
  token: z.string().min(1),
  name: userInsertSchema.shape.name.trim().min(1),
  email: z.email(),
  workspaceName: workspaceSelectSchema.shape.name.trim().min(1),
})
