import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import * as z from 'zod'
import {
  GLOSSARY_ERRORS,
  NOT_FOUND_ERRORS,
  PEOPLE_ONLY_ERRORS,
} from '../constants/contract.constants.ts'
import {
  glossaryConceptCreateInputSchema,
  glossaryConceptRefInputSchema,
  glossaryConceptsInputSchema,
  glossaryConceptUpdateInputSchema,
  glossaryListInputSchema,
  glossaryStatusInputSchema,
  glossaryTermSchema,
} from '../validators/glossary.validator.ts'

const PEOPLE_ONLY_GLOSSARY_ERRORS = { ...GLOSSARY_ERRORS, ...PEOPLE_ONLY_ERRORS }

export const glossaryContract = {
  list: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/glossary',
        operationId: 'listGlossary',
        summary: 'List the validated glossary terms',
        description:
          'The validated terms of the glossary of the workspace that owns the project: a term and plural per language, the words to avoid, and the concepts never translated. Services such as a CMS pull it to check and translate content. Suggested and turned down concepts are not listed.',
        tags: ['glossary'],
      }),
    )
    .input(glossaryListInputSchema)
    .output(z.array(glossaryTermSchema))
    .errors(NOT_FOUND_ERRORS),
  listConcepts: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/workspaces/{workspaceId}/glossary',
        operationId: 'listGlossaryConcepts',
        summary: 'List every glossary concept of a workspace',
        description:
          'Every concept of the workspace glossary, whatever its status: suggested, validated or turned down. Only validated concepts check texts.',
        tags: ['glossary'],
      }),
    )
    .input(glossaryConceptsInputSchema)
    .output(z.array(glossaryTermSchema))
    .errors(NOT_FOUND_ERRORS),
  createConcept: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/workspaces/{workspaceId}/glossary',
        operationId: 'suggestGlossaryConcept',
        summary: 'Suggest a glossary concept',
        description:
          'Add a concept with its terms. It starts as suggested and checks nothing until a person validates it. Owners and admins write any language; reviewers write the languages they review.',
        tags: ['glossary'],
      }),
    )
    .input(glossaryConceptCreateInputSchema)
    .output(glossaryTermSchema)
    .errors(GLOSSARY_ERRORS),
  updateConcept: oc
    .meta(
      openapi({
        method: 'PUT',
        path: '/glossary/{conceptId}',
        operationId: 'updateGlossaryConcept',
        summary: 'Change a glossary concept',
        description:
          'Replace the details and the terms of a concept. People only: an agent suggests, a person decides.',
        tags: ['glossary'],
      }),
    )
    .input(glossaryConceptUpdateInputSchema)
    .output(glossaryTermSchema)
    .errors(PEOPLE_ONLY_GLOSSARY_ERRORS),
  setConceptStatus: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/glossary/{conceptId}/status',
        operationId: 'setGlossaryConceptStatus',
        summary: 'Validate or turn down a glossary concept',
        description:
          'Validating a concept makes its words to avoid and never-translated words check the texts; turning it down or suggesting it again stops that. People only.',
        tags: ['glossary'],
      }),
    )
    .input(glossaryStatusInputSchema)
    .output(glossaryTermSchema)
    .errors(PEOPLE_ONLY_GLOSSARY_ERRORS),
  removeConcept: oc
    .meta(
      openapi({
        method: 'DELETE',
        path: '/glossary/{conceptId}',
        operationId: 'removeGlossaryConcept',
        summary: 'Remove a glossary concept',
        tags: ['glossary'],
      }),
    )
    .input(glossaryConceptRefInputSchema)
    .output(z.object({ removed: z.literal(true) }))
    .errors(PEOPLE_ONLY_GLOSSARY_ERRORS),
}
