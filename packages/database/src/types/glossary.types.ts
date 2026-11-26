import type { ValueOf } from '@glot/utils/types'
import type { GLOSSARY_TERM_STATUSES } from '../constants/glossary.constants.ts'

export type GlossaryTermStatus = ValueOf<typeof GLOSSARY_TERM_STATUSES>
