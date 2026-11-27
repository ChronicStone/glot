import type { Text, Translation, WidgetSession } from '@glot/contract'
import type { ValueOf } from '@glot/utils/types'
import type { ComponentInternalInstance } from 'vue'
import type { DOCK_SIDES } from '../constants/widget.constants.ts'

export interface KeyLog {
  owners: Map<number, Map<string, string>>
  keys: Map<string, string>
}

export interface PageNode {
  node: globalThis.Text | Element
  owner: ComponentInternalInstance | null
  attribute: string | null
  text: string
}

export interface PageHit {
  id: string
  keys: string[]
  node: globalThis.Text | Element
  attribute: string | null
  start: number
  end: number
}

export interface PlacedHit {
  hit: PageHit
  rect: DOMRect
}

export interface PageText {
  key: string
  text: Text
}

export interface WidgetOptions {
  url: string
  project: string
}

export type StoredSession = Omit<WidgetSession, 'expiresAt'> & { expiresAt: string }

export type SignInReply =
  | { state: string; session: StoredSession; error?: never }
  | { state: string; error: string; session?: never }

export interface OutlineBox {
  id: string
  rect: DOMRect
  tone: 'check' | 'fix' | 'edit'
  badge: 'TO_CHECK' | 'NEEDS_FIX' | null
}

export interface PageRow {
  key: string
  text: Text
  state: Translation['state']
  value: string
  reason: string
  clickable: boolean
}

export type DockSide = ValueOf<typeof DOCK_SIDES>

export interface ScreenPoint {
  x: number
  y: number
}
