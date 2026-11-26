import type { InferSelectModel } from 'drizzle-orm'

export interface ExampleMetadata {
  locale: 'en' | 'fr'
  value: string
}

export type ExampleRecord = { id: string }
export type ExampleMapped<T> = { [Key in keyof T]: T[Key] }
export type ExampleInferred = InferSelectModel<typeof exampleTable>
