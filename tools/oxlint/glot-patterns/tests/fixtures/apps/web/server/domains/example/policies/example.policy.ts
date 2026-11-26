import type { ExampleInput } from '../types/example.types.ts'

export default class ExamplePolicy {
  authorize(input: ExampleInput) {
    return input.id.length > 0
  }
}
