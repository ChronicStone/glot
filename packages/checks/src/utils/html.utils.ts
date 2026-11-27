const HTML_TAG_PATTERN = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^<>]*?(\/?)>/gu

export function htmlTagsOf(message: string) {
  return [...message.matchAll(HTML_TAG_PATTERN)]
    .map((match) => `<${match[1]}${match[2]?.toLowerCase()}${match[3]}>`)
    .toSorted()
}

export function withoutHtmlTags(message: string) {
  return message.replace(HTML_TAG_PATTERN, ' ')
}
