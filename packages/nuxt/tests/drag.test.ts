import { expect, test } from 'vite-plus/test'
import { dragThreshold } from '../src/runtime/utils/layout.utils.ts'

test('a finger gets more room than a mouse before a tap becomes a drag', () => {
  expect(dragThreshold('touch')).toBe(8)
  expect(dragThreshold('pen')).toBe(8)
  expect(dragThreshold('mouse')).toBe(4)
})
