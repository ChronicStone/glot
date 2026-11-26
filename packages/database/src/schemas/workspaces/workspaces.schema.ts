import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import {
  WORKSPACE_INVITATION_STATUSES,
  WORKSPACE_ROLES,
} from '../../constants/workspaces.constants.ts'
import { user } from '../users/users.schema.ts'

export const workspaceRoleEnum = pgEnum('workspace_role', WORKSPACE_ROLES)

export const workspaceInvitationStatusEnum = pgEnum(
  'workspace_invitation_status',
  WORKSPACE_INVITATION_STATUSES,
)

export const workspaces = pgTable(
  'workspace',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    name: text().notNull(),
    slug: text().notNull(),
    logo: text(),
    metadata: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('workspace_slug_unique').on(table.slug)],
)

export const workspaceMemberships = pgTable(
  'workspace_membership',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: workspaceRoleEnum().notNull().default(WORKSPACE_ROLES.VIEWER),
    languages: text().array(),
    expiresAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('workspace_membership_user_unique').on(table.workspaceId, table.userId),
    index('workspace_membership_user_idx').on(table.userId),
  ],
)

export const workspaceInvitations = pgTable(
  'workspace_invitation',
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text().notNull(),
    role: workspaceRoleEnum().notNull(),
    status: workspaceInvitationStatusEnum()
      .notNull()
      .default(WORKSPACE_INVITATION_STATUSES.PENDING),
    inviterId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('workspace_invitation_email_idx').on(table.email)],
)
