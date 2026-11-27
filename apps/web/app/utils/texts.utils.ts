function decodeTextId(textId: string): unknown {
  const binary = atob(textId.replaceAll('-', '+').replaceAll('_', '/'))
  const bytes = Uint8Array.from(binary, (letter) => letter.codePointAt(0) ?? 0)

  return JSON.parse(new TextDecoder().decode(bytes))
}

export function keyOfTextId(textId: string) {
  try {
    const parts = decodeTextId(textId)

    if (Array.isArray(parts) && parts.every((part) => typeof part === 'string')) {
      return { source: parts[0] ?? '', path: parts.slice(1).join('.') }
    }
  } catch {
    return { source: '', path: textId }
  }

  return { source: '', path: textId }
}
