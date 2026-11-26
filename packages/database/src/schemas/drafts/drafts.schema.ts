import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { DRAFT_STATUSES } from '../../constants/drafts.constants.ts'
import { projects } from '../projects/projects.schema.ts'
import { user } from '../users/users.schema.ts'

export const draftStatusEnum = pgEnum('draft_status', DRAFT_STATUSES)

export const drafts = pgTable(
  'draft',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    textId: text().notNull(),
    language: text().notNull(),
    value: text().notNull(),
    authorId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: draftStatusEnum().notNull().default(DRAFT_STATUSES.DRAFT),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('draft_project_text_idx').on(table.projectId, table.textId, table.language),
    index('draft_author_status_idx').on(table.authorId, table.status),
    uniqueIndex('draft_active_unique')
      .on(table.projectId, table.textId, table.language, table.authorId)
      .where(sql.raw(`status in ('${DRAFT_STATUSES.DRAFT}', '${DRAFT_STATUSES.IN_REVIEW}')`)),
  ],
)
