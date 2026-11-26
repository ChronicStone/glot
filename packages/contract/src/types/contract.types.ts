import type { ValueOf } from '@glot/utils/types'
import type { PEOPLE_ONLY_PROCEDURES } from '../constants/contract.constants.ts'
import type { contract } from '../contracts/index.ts'

export type Contract = typeof contract

export type PeopleOnlyProcedure = ValueOf<typeof PEOPLE_ONLY_PROCEDURES>
