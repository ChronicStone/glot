import { checkText } from '@glot/checks'

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

  if (first && typeof first === 'object' && 'code' in first && first.code === 'too_small') {
    return 'Required.'
  }

  return first && typeof first === 'object' && 'message' in first ? String(first.message) : ''
}

export function textCheckError(options: { source: string; target: string }) {
  if (!options.target.trim()) {
    return
  }

  return checkText({ source: options.source, target: options.target, avoid: [] })[0]?.message
}
