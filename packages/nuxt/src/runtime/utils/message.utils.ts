export function nestMessage(options: { path: string[]; value: unknown }) {
  return options.path
    .toReversed()
    .reduce<unknown>((inner, segment) => ({ [segment]: inner }), options.value)
}

export function withoutPath(options: { messages: unknown; path: string[] }): unknown {
  const [head, ...rest] = options.path

  if (head === undefined || typeof options.messages !== 'object' || options.messages === null) {
    return options.messages
  }

  const entries = Object.entries(options.messages).flatMap(([name, inner]) => {
    if (name !== head) {
      return [[name, inner]]
    }

    return rest.length === 0 ? [] : [[name, withoutPath({ messages: inner, path: rest })]]
  })

  return Object.fromEntries(entries)
}

export function serializeEditable(root: Node): string {
  return [...root.childNodes]
    .map((child) => {
      if (child instanceof HTMLElement && child.dataset.token) {
        return child.dataset.token
      }

      if (child instanceof HTMLBRElement) {
        return '\n'
      }

      return child instanceof HTMLElement ? serializeEditable(child) : (child.textContent ?? '')
    })
    .join('')
}

export function placeholderToken(value: string) {
  return value.startsWith('@:') ? value : `{${value}}`
}
