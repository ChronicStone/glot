import type { Database } from '@glot/database'
import { DEMO_GLOSSARY } from './fixtures/demo-glossary.fixtures.ts'

export async function seedDemoGlossary(db: Database, options: { workspaceId: string }) {
  for (const { terms, ...concept } of DEMO_GLOSSARY) {
    const created = await db.glossaryConcepts.create({
      data: { ...concept, workspaceId: options.workspaceId },
    })

    await db.glossaryConceptTerms.createMany({
      data: Object.entries(terms).map(([language, words]) => ({
        ...words,
        conceptId: created.id,
        language,
      })),
    })
  }
}
