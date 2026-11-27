export function monthRange(month: string) {
  const from = new Date(`${month}-01T00:00:00Z`)

  return { from, to: new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1)) }
}
