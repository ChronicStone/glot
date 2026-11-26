function resourceHelper() {
  return 'helper'
}

export function createBadResource() {
  return withContext<{ id: string }>(resourceHelper())
}
