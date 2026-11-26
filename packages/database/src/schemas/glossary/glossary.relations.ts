import { defineRelationsPart } from 'drizzle-orm'
import * as schema from '../index.ts'

export const glossaryRelationsPart = defineRelationsPart(schema, (r) => ({
  glossaryConcepts: {
    workspace: r.one.workspaces({
      from: r.glossaryConcepts.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    terms: r.many.glossaryConceptTerms({
      from: r.glossaryConcepts.id,
      to: r.glossaryConceptTerms.conceptId,
    }),
  },
  glossaryConceptTerms: {
    concept: r.one.glossaryConcepts({
      from: r.glossaryConceptTerms.conceptId,
      to: r.glossaryConcepts.id,
      optional: false,
    }),
  },
}))
