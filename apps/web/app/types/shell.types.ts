import type { ValueOf } from '@glot/utils/types'
import type { APPEARANCES, PROJECT_SECTIONS } from '../constants/shell.constants.ts'

export type Appearance = ValueOf<typeof APPEARANCES>

export type ProjectSection = ValueOf<typeof PROJECT_SECTIONS>
