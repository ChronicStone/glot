import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { COMMENT_KINDS } from '../../constants/comments.constants.ts'
import { projects } from '../projects/projects.schema.ts'
import { user } from '../users/users.schema.ts'

export const commentKindEnum = pgEnum('comment_kind', COMMENT_KINDS)

export const comments = pgTable(
  'comment',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    textId: text().notNull(),
    language: text().notNull(),
    authorId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: commentKindEnum().notNull().default(COMMENT_KINDS.COMMENT),
    body: text().notNull(),
    targetHash: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('comment_text_idx').on(table.projectId, table.textId, table.language)],
)
