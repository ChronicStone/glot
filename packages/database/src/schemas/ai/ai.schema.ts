import { sql } from 'drizzle-orm'
import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import {
  AI_DEFAULT_MODELS,
  AI_DEFAULT_MONTHLY_BUDGET_MICROS,
  AI_DEFAULT_PROVIDER,
  AI_FILL_STOP_REASONS,
  AI_PROVIDERS,
  AI_USAGE_KINDS,
} from '../../constants/ai.constants.ts'
import { jobs } from '../jobs/jobs.schema.ts'
import { projects } from '../projects/projects.schema.ts'
import { user } from '../users/users.schema.ts'
import { workspaces } from '../workspaces/workspaces.schema.ts'

export const aiProviderEnum = pgEnum('ai_provider', AI_PROVIDERS)

export const aiUsageKindEnum = pgEnum('ai_usage_kind', AI_USAGE_KINDS)

export const aiFillStopReasonEnum = pgEnum('ai_fill_stop_reason', AI_FILL_STOP_REASONS)

export const aiSettings = pgTable(
  'ai_settings',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    provider: aiProviderEnum().notNull().default(AI_DEFAULT_PROVIDER),
    model: text().notNull().default(AI_DEFAULT_MODELS[AI_DEFAULT_PROVIDER]),
    monthlyBudgetMicros: bigint({ mode: 'number' })
      .notNull()
      .default(AI_DEFAULT_MONTHLY_BUDGET_MICROS),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('ai_settings_workspace_unique').on(table.workspaceId)],
)

export const aiKeys = pgTable(
  'ai_key',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    provider: aiProviderEnum().notNull(),
    ciphertext: text().notNull(),
    last4: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('ai_key_workspace_provider_unique').on(table.workspaceId, table.provider),
  ],
)

export const aiUsage = pgTable(
  'ai_usage',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    language: text().notNull(),
    kind: aiUsageKindEnum().notNull(),
    provider: aiProviderEnum().notNull(),
    model: text().notNull(),
    inputTokens: integer().notNull(),
    outputTokens: integer().notNull(),
    costMicros: bigint({ mode: 'number' }).notNull(),
    texts: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('ai_usage_workspace_month_idx').on(table.workspaceId, table.createdAt)],
)

export const aiFills = pgTable(
  'ai_fill',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    jobId: uuid()
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    language: text().notNull(),
    requestedById: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    total: integer().notNull().default(0),
    filled: integer().notNull().default(0),
    rejected: integer().notNull().default(0),
    stopReason: aiFillStopReasonEnum(),
    stopMessage: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('ai_fill_job_unique').on(table.jobId),
    index('ai_fill_project_idx').on(table.projectId, table.createdAt),
  ],
)
