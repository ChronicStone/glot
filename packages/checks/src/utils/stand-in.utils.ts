export function placeholderStandIn(name: string) {
  const word = name.replaceAll(/[^a-zA-Z0-9-]/gu, '-')

  return /^[a-zA-Z]/u.test(word) ? word : `p${word}`
}
