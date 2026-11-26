import type { ValueOf } from '@glot/utils/types'
import type { JOB_KINDS, JOB_STATUSES } from '../constants/jobs.constants.ts'
import type { jobs } from '../schemas/jobs/jobs.schema.ts'

export type Job = typeof jobs.$inferSelect

export type JobInsert = typeof jobs.$inferInsert

export type JobKind = ValueOf<typeof JOB_KINDS>

export type JobStatus = ValueOf<typeof JOB_STATUSES>
