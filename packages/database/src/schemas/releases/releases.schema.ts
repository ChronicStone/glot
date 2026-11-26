import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { RELEASE_STATUSES, RELEASE_TRIGGERS } from '../../constants/releases.constants.ts'
import { drafts } from '../drafts/drafts.schema.ts'
import { projects } from '../projects/projects.schema.ts'
import { user } from '../users/users.schema.ts'

export const releaseStatusEnum = pgEnum('release_status', RELEASE_STATUSES)

export const releaseTriggerEnum = pgEnum('release_trigger', RELEASE_TRIGGERS)

export const releases = pgTable(
  'release',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    status: releaseStatusEnum().notNull().default(RELEASE_STATUSES.OPEN),
    trigger: releaseTriggerEnum().notNull(),
    startedById: text().references(() => user.id, { onDelete: 'set null' }),
    branch: text().notNull(),
    baseCommit: text().notNull(),
    commit: text().notNull(),
    pullRequestNumber: integer(),
    pullRequestUrl: text(),
    changeCount: integer().notNull().default(0),
    approvalCount: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    mergedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    uniqueIndex('release_open_unique')
      .on(table.projectId)
      .where(sql.raw(`status = '${RELEASE_STATUSES.OPEN}'`)),
    index('release_project_created_idx').on(table.projectId, table.createdAt),
  ],
)

export const releaseChanges = pgTable(
  'release_change',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    releaseId: uuid()
      .notNull()
      .references(() => releases.id, { onDelete: 'cascade' }),
    draftId: uuid().references(() => drafts.id, { onDelete: 'set null' }),
    textId: text().notNull(),
    language: text().notNull(),
    previousValue: text(),
    value: text().notNull(),
    authorId: text().references(() => user.id, { onDelete: 'set null' }),
    undoDraftId: uuid().references(() => drafts.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('release_change_text_unique').on(table.releaseId, table.textId, table.language),
  ],
)
