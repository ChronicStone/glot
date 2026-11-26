import { boolean, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { DEFAULT_LOCALE } from '../../constants/users.constants.ts'

export const user = pgTable(
  'user',
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    locale: text().notNull().default(DEFAULT_LOCALE),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_email_unique').on(table.email),
    index('user_created_id_idx').on(table.createdAt, table.id),
  ],
)
