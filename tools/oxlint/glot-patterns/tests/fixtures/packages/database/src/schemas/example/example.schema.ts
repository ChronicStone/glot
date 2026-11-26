import { jsonb } from 'drizzle-orm/pg-core'
import type { ExampleMetadata } from '../../types/example.types.ts'

export const exampleMetadata = jsonb().$type<ExampleMetadata>()
