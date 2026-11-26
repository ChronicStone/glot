import { APPEARANCES, APPEARANCE_STORAGE_KEY } from '../constants/shell.constants.ts'
import type { Appearance } from '../types/shell.types.ts'

function storedAppearance() {
  const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY)

  return Object.values(APPEARANCES).find((value) => value === stored) ?? APPEARANCES.SYSTEM
}

export function useAppearance() {
  const appearance = useState<Appearance>('appearance', storedAppearance)

  function choose(next: Appearance) {
    appearance.value = next
    localStorage.setItem(APPEARANCE_STORAGE_KEY, next)

    if (next === APPEARANCES.SYSTEM) {
      delete document.documentElement.dataset.theme

      return
    }

    document.documentElement.dataset.theme = next
  }

  return { appearance, choose }
}
