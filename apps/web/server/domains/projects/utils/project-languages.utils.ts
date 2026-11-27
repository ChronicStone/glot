export function sourcesWithinLanguages<Source extends { languages: string[] }>(options: {
  languages: string[]
  sources: Source[]
}) {
  return options.sources.map((source) => ({
    ...source,
    languages: source.languages.filter((language) => options.languages.includes(language)),
  }))
}
