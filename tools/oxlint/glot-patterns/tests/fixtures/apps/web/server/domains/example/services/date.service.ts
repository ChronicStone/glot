export default class DateService {
  execute(): Date {
    return new Date()
  }

  cursor(value: Date): string {
    return value.toISOString()
  }
}
