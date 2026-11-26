import { sql } from 'drizzle-orm'
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { projects } from '../projects/projects.schema.ts'
import { releases } from '../releases/releases.schema.ts'
import { user } from '../users/users.schema.ts'

export const approvals = pgTable(
  'approval',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    textId: text().notNull(),
    language: text().notNull(),
    sourceHash: text().notNull(),
    targetHash: text().notNull(),
    reviewerId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    selfApproved: boolean().notNull().default(false),
    releaseId: uuid().references(() => releases.id, { onDelete: 'set null' }),
    releasedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('approval_text_pair_unique').on(
      table.projectId,
      table.textId,
      table.language,
      table.sourceHash,
      table.targetHash,
    ),
    index('approval_unreleased_idx').on(table.projectId, table.releasedAt),
  ],
)
