import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { SOURCE_KINDS } from '../../constants/projects.constants.ts'
import { workspaces } from '../workspaces/workspaces.schema.ts'

export const sourceKindEnum = pgEnum('source_kind', SOURCE_KINDS)

export const projects = pgTable(
  'project',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    repository: text().notNull(),
    defaultBranch: text().notNull().default('main'),
    sourceLanguage: text().notNull(),
    languages: text().array().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('project_workspace_repository_unique').on(table.workspaceId, table.repository),
    index('project_workspace_idx').on(table.workspaceId),
  ],
)

export const projectApps = pgTable(
  'project_app',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    widget: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('project_app_name_unique').on(table.projectId, table.name)],
)

export const projectSources = pgTable(
  'project_source',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    kind: sourceKindEnum().notNull().default(SOURCE_KINDS.VUE_I18N),
    pathPattern: text().notNull(),
    sourceLanguage: text().notNull(),
    languages: text().array().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('project_source_name_unique').on(table.projectId, table.name)],
)

export const projectAppSources = pgTable(
  'project_app_source',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    appId: uuid()
      .notNull()
      .references(() => projectApps.id, { onDelete: 'cascade' }),
    sourceId: uuid()
      .notNull()
      .references(() => projectSources.id, { onDelete: 'cascade' }),
    position: integer().notNull().default(0),
  },
  (table) => [uniqueIndex('project_app_source_unique').on(table.appId, table.sourceId)],
)
