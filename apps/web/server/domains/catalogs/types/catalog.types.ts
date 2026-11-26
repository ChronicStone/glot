import type { GlossaryTerm, Text } from '@glot/contract'

export type CatalogText = Text & { readers: number }

export interface CatalogSource {
  texts: Record<string, CatalogText[]>
  glossary: Record<string, GlossaryTerm[]>
}
