import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import { PEOPLE_ONLY_ERRORS, TEMPLATE_ERRORS } from '../constants/contract.constants.ts'
import {
  templateListInputSchema,
  templateListSchema,
  templatePreviewInputSchema,
  templatePreviewSchema,
  templateRefInputSchema,
  templateSendTestInputSchema,
  templateSendTestSchema,
} from '../validators/templates.validator.ts'
import { textListSchema } from '../validators/texts.validator.ts'

export const templatesContract = {
  list: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/templates',
        operationId: 'listTemplates',
        summary: 'Emails, documents and SMS of a project',
        description:
          "The brands and templates the project's preview adapter declares, each with how many texts it uses and their worst state.",
        tags: ['templates'],
      }),
    )
    .input(templateListInputSchema)
    .output(templateListSchema)
    .errors(TEMPLATE_ERRORS),
  texts: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/templates/{templateId}/texts',
        operationId: 'listTemplateTexts',
        summary: 'The texts of a template for a brand',
        description:
          "The texts a template uses, in reading order, each taken from the first of the brand's sources that holds it: the brand, then its parent brand, then the texts shared by every brand.",
        tags: ['templates'],
      }),
    )
    .input(templateRefInputSchema)
    .output(textListSchema)
    .errors(TEMPLATE_ERRORS),
  preview: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/templates/{templateId}/preview',
        operationId: 'previewTemplate',
        summary: 'Render a template',
        description:
          "Render a template for a brand and a language through the project's preview adapter. Each text shows your own draft, or else a draft sent for review, or else its current value; overrides replace any of them.",
        tags: ['templates'],
      }),
    )
    .input(templatePreviewInputSchema)
    .output(templatePreviewSchema)
    .errors(TEMPLATE_ERRORS),
  sendTest: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/templates/{templateId}/test',
        operationId: 'sendTestTemplate',
        summary: 'Send a test of a template to yourself',
        description:
          'Render a template as the preview shows it and have the preview adapter send it to your address. Only a signed-in person can ask: an API key has no address.',
        tags: ['templates'],
      }),
    )
    .input(templateSendTestInputSchema)
    .output(templateSendTestSchema)
    .errors({ ...TEMPLATE_ERRORS, ...PEOPLE_ONLY_ERRORS }),
}
