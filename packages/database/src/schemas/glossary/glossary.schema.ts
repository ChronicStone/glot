import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { GLOSSARY_TERM_STATUSES } from '../../constants/glossary.constants.ts'
import { workspaces } from '../workspaces/workspaces.schema.ts'

export const glossaryTermStatusEnum = pgEnum('glossary_term_status', GLOSSARY_TERM_STATUSES)

export const glossaryConcepts = pgTable(
  'glossary_concept',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    definition: text().notNull().default(''),
    status: glossaryTermStatusEnum().notNull().default(GLOSSARY_TERM_STATUSES.SUGGESTED),
    neverTranslate: boolean().notNull().default(false),
    notes: text().notNull().default(''),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('glossary_concept_name_unique').on(table.workspaceId, sql`lower(${table.name})`),
    index('glossary_concept_status_idx').on(table.workspaceId, table.status),
  ],
)

export const glossaryConceptTerms = pgTable(
  'glossary_concept_term',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    conceptId: uuid()
      .notNull()
      .references(() => glossaryConcepts.id, { onDelete: 'cascade' }),
    language: text().notNull(),
    term: text().notNull(),
    plural: text(),
    avoid: text().array().notNull().default([]),
  },
  (table) => [uniqueIndex('glossary_concept_term_unique').on(table.conceptId, table.language)],
)
