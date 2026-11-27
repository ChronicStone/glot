import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import { DOCK_SIDES, LAYOUT_STORAGE } from '../constants/widget.constants.ts'
import type { DockSide, ScreenPoint } from '../types/widget.types.ts'

export function useWidgetLayout(project: string) {
  const launcher = useLocalStorage<ScreenPoint | null>(LAYOUT_STORAGE.LAUNCHER + project, null, {
    serializer: StorageSerializers.object,
    writeDefaults: false,
  })

  const dock = useLocalStorage<DockSide>(LAYOUT_STORAGE.DOCK + project, DOCK_SIDES.RIGHT, {
    writeDefaults: false,
  })

  return { launcher, dock }
}
