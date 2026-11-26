import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { JOB_KINDS, JOB_STATUSES } from '../../constants/jobs.constants.ts'
import { projects } from '../projects/projects.schema.ts'

export const jobKindEnum = pgEnum('job_kind', JOB_KINDS)

export const jobStatusEnum = pgEnum('job_status', JOB_STATUSES)

export const jobs = pgTable(
  'job',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    kind: jobKindEnum().notNull(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    runAt: timestamp({ withTimezone: true }).notNull(),
    status: jobStatusEnum().notNull().default(JOB_STATUSES.PENDING),
    startedAt: timestamp({ withTimezone: true }),
    finishedAt: timestamp({ withTimezone: true }),
    error: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('job_slot_unique').on(table.kind, table.projectId, table.runAt),
    index('job_due_idx').on(table.status, table.runAt),
  ],
)
