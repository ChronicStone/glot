export function pairKey(options: { textId: string; language: string }) {
  return `${options.textId}|${options.language}`
}
