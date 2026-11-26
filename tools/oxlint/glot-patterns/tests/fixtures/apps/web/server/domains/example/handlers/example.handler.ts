export default class ExampleHandler {
  async run() {
    return { type: 'DONE' as const }
  }
}
