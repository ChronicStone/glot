export function approvalKey(options: {
  textId: string
  language: string
  sourceHash: string
  targetHash: string
}) {
  return [options.textId, options.language, options.sourceHash, options.targetHash].join('|')
}
