export function flattenMessages(json: unknown) {
  const messages: Array<{ path: string[]; value: string }> = []
  const pending: Array<{ path: string[]; node: unknown }> = [{ path: [], node: json }]

  for (let current = pending.pop(); current; current = pending.pop()) {
    const { path, node } = current

    if (typeof node === 'string') {
      if (path.length > 0) {
        messages.push({ path, value: node })
      }

      continue
    }

    const children = Array.isArray(node)
      ? node.map((child, index): [string, unknown] => [String(index), child])
      : node && typeof node === 'object'
        ? Object.entries(node)
        : []

    pending.push(
      ...children
        .toReversed()
        .map(([segment, child]) => ({ path: [...path, segment], node: child })),
    )
  }

  return messages
}

export function parseJsonFile(options: { path: string; content: string }) {
  try {
    const parsed: unknown = JSON.parse(options.content.replace(/^﻿/u, ''))

    return parsed
  } catch {
    throw new Error(`${options.path} is not valid JSON`)
  }
}
