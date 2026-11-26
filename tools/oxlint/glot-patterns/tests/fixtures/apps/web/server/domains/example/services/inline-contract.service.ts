export default class InlineContractService {
  execute(options: { id: string }): Promise<{ ok: boolean }> {
    return Promise.resolve({ ok: Boolean(options.id) })
  }
}
