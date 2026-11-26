import { RELEASE_SLOT_HOURS_UTC } from '../constants/releases.constants.ts'

const SLOT_HOURS = Object.values(RELEASE_SLOT_HOURS_UTC).toSorted((a, b) => a - b)

export function slotsOfDay(now: Date) {
  return SLOT_HOURS.map(
    (hour) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour)),
  )
}

export function nextRunAt(now: Date) {
  const tomorrow = new Date(now.getTime() + 86_400_000)

  return [...slotsOfDay(now), ...slotsOfDay(tomorrow)].find((slot) => slot > now) ?? tomorrow
}
