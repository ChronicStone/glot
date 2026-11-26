import { createSelectSchema } from 'drizzle-orm/zod'
import { user } from '../schemas/users/users.schema.ts'

export const userSelectSchema = createSelectSchema(user)
