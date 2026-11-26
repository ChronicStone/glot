import { jsonb } from 'drizzle-orm/pg-core'

export const inlineMetadata = jsonb().$type<Array<{ locale: 'en' | 'fr'; value: string }>>()
