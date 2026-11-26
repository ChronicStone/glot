import { relations } from 'drizzle-orm'

function relationHelper() {
  return true
}

export const badRelations = relations(exampleTable, ({ one }) => ({
  example: one(exampleTable),
}))
