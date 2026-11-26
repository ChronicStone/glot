import type { ValueOf } from '@glot/utils/types'
import type { RELEASE_STATUSES, RELEASE_TRIGGERS } from '../constants/releases.constants.ts'
import type { releaseChanges, releases } from '../schemas/releases/releases.schema.ts'

export type Release = typeof releases.$inferSelect

export type ReleaseInsert = typeof releases.$inferInsert

export type ReleaseChange = typeof releaseChanges.$inferSelect

export type ReleaseChangeInsert = typeof releaseChanges.$inferInsert

export type ReleaseStatus = ValueOf<typeof RELEASE_STATUSES>

export type ReleaseTrigger = ValueOf<typeof RELEASE_TRIGGERS>
