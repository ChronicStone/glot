function outcome() {
  return { type: 'DONE' as const }
}

export default class BadHandler {
  async run() {
    return outcome()
  }
}
