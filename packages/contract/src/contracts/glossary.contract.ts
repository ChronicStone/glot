import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import * as z from 'zod'
import { glossaryListInputSchema, glossaryTermSchema } from '../validators/glossary.validator.ts'

export const glossaryContract = {
  list: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/glossary',
        operationId: 'listGlossary',
        summary: 'List glossary terms',
        description:
          'The workspace glossary. Services such as a CMS pull it to check and translate content.',
        tags: ['glossary'],
      }),
    )
    .input(glossaryListInputSchema)
    .output(z.array(glossaryTermSchema)),
}
