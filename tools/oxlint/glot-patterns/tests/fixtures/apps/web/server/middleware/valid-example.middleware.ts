import type { ExampleRequestContext } from '../modules/example/types/example.types.ts'

export default class ValidExampleMiddleware {
  async handle(context: ExampleRequestContext, next: () => Promise<void>) {
    await next()
    return context.request.id
  }
}
