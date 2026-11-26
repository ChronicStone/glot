export default class ValidExampleService {
  execute(values: string[]) {
    return values.map((value) => this.normalize(value))
  }

  private normalize(value: string) {
    return { value: value.trim() }
  }
}
