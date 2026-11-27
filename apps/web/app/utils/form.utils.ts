import { checkText } from '@glot/checks'
import type { Syntax } from '@glot/checks'

export function inputValue(event: Event) {
  return event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
    ? event.target.value
    : ''
}

export function errorMessage(errors: readonly unknown[]) {
  const first = errors.flat(2).find(Boolean)

  if (typeof first === 'string') {
    return first
  }

  if (first && typeof first === 'object' && 'code' in first) {
    const origin = 'origin' in first ? first.origin : undefined

    if (first.code === 'too_small' && 'minimum' in first) {
      if (origin === 'number') {
        return `Use ${String(first.minimum)} or more.`
      }

      return Number(first.minimum) <= 1
        ? 'Required.'
        : `Use at least ${String(first.minimum)} characters.`
    }

    if (first.code === 'too_big' && 'maximum' in first && origin === 'number') {
      return `Use ${String(first.maximum)} or less.`
    }
  }

  if (first && typeof first === 'object' && 'format' in first && first.format === 'email') {
    return 'Write an email address, such as name@example.com.'
  }

  if (first && typeof first === 'object' && 'format' in first && first.format === 'url') {
    return 'Write a full address, such as https://previews.example.com.'
  }

  return first && typeof first === 'object' && 'message' in first ? String(first.message) : ''
}

export function textCheckError(options: {
  source: string
  target: string
  syntax?: Syntax
  language?: string
}) {
  if (!options.target.trim()) {
    return
  }

  return checkText({ ...options, avoid: [] })[0]?.message
}
