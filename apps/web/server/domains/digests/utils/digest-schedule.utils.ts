import { DIGEST_SLOT_HOUR_UTC } from '../constants/digests.constants.ts'

export function digestSlot(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), DIGEST_SLOT_HOUR_UTC),
  )
}
