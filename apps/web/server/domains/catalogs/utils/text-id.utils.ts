import type { KeyRef } from '@glot/contract'

export function encodeTextId(key: KeyRef) {
  return Buffer.from(JSON.stringify([key.source, ...key.path])).toString('base64url')
}
