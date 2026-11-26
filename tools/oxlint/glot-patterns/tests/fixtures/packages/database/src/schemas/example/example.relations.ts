import { relations } from 'drizzle-orm'

export const exampleRelations = relations(exampleTable, ({ one }) => ({
  example: one(exampleTable),
}))
