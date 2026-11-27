const COUNT = new Intl.NumberFormat('en-US')

export function counted(options: { count: number; one: string; other: string }) {
  return `${COUNT.format(options.count)}\u00A0${options.count === 1 ? options.one : options.other}`
}
