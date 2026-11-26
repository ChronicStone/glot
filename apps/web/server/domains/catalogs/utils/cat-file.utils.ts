export function parseCatFileBatch(output: Buffer) {
  const contents: Array<string | null> = []
  let at = 0

  while (at < output.length) {
    const lineEnd = output.indexOf('\n', at)
    const header = output.toString('utf8', at, lineEnd)
    const size = header.endsWith(' missing') ? null : Number(header.split(' ')[2])

    if (size === null) {
      contents.push(null)
      at = lineEnd + 1
    } else {
      contents.push(output.toString('utf8', lineEnd + 1, lineEnd + 1 + size))
      at = lineEnd + 1 + size + 1
    }
  }

  return contents
}
