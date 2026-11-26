import type { ValueOf } from '@glot/utils/types'
import type { SOURCE_KINDS } from '../constants/projects.constants.ts'
import type {
  projectAppSources,
  projectApps,
  projectSources,
  projects,
} from '../schemas/projects/projects.schema.ts'

export type Project = typeof projects.$inferSelect

export type ProjectInsert = typeof projects.$inferInsert

export type ProjectApp = typeof projectApps.$inferSelect

export type ProjectSource = typeof projectSources.$inferSelect

export type ProjectSourceInsert = typeof projectSources.$inferInsert

export type ProjectAppSource = typeof projectAppSources.$inferSelect

export type SourceKind = ValueOf<typeof SOURCE_KINDS>
