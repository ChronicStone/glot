import type { ExampleInput } from '../types/example.types.ts'

export default class ValidExampleController {
  show(input: ExampleInput) {
    return Promise.resolve(input)
  }
}
