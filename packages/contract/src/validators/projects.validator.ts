import {
  projectAppSelectSchema,
  projectInsertSchema,
  projectSelectSchema,
  projectSourceSelectSchema,
} from '@glot/database/validators/projects'
import * as z from 'zod'
import { languageCodeSchema } from './languages.validator.ts'
import { textRefInputSchema } from './texts.validator.ts'

export const projectSourceSchema = projectSourceSelectSchema.pick({
  name: true,
  kind: true,
  pathPattern: true,
  sourceLanguage: true,
  languages: true,
})

export const projectSchema = projectSelectSchema
  .pick({ id: true, workspaceId: true, name: true, sourceLanguage: true, languages: true })
  .extend({
    apps: z.array(projectAppSelectSchema.pick({ id: true, name: true, widget: true })),
    sources: z.array(projectSourceSchema),
  })

export const projectSyncInputSchema = textRefInputSchema.pick({ projectId: true })

export const projectSyncSchema = z.object({
  commit: z.string().describe('The commit of the default branch the texts were read from.'),
  texts: z.number().int().describe('How many texts the project holds at that commit.'),
})

const relativePathSchema = z
  .string()
  .min(1)
  .regex(/^(?!\/)(?!.*\\)(?!.*\.\.)/u, 'Must be a path inside the repository, without ..')

const languagesInputSchema = z.array(languageCodeSchema).min(1)

export const projectSourceInputSchema = projectSourceSchema.extend({
  name: projectSourceSchema.shape.name.min(1),
  pathPattern: relativePathSchema
    .regex(/\{locale\}/u, 'Must contain {locale}')
    .regex(/\.json$/u, 'Must end in .json')
    .describe(
      'Where the files are inside the repository, with {locale} for the language: locales/{locale}.json.',
    ),
  sourceLanguage: languageCodeSchema,
  languages: languagesInputSchema,
})

export const projectCreateInputSchema = projectInsertSchema
  .pick({ workspaceId: true, name: true, repository: true })
  .extend({
    name: projectSelectSchema.shape.name.min(1),
    repository: projectSelectSchema.shape.repository
      .regex(/^(?!\.)[\w.-]+\/(?!\.)[\w.-]+$/u)
      .describe('owner/name on GitHub, or the same two folders under the local git root.'),
    defaultBranch: relativePathSchema,
    sourceLanguage: languageCodeSchema,
    languages: languagesInputSchema,
    sources: z.array(projectSourceInputSchema).min(1),
  })

export const projectUpdateInputSchema = projectCreateInputSchema
  .omit({ workspaceId: true, repository: true })
  .extend(projectSyncInputSchema.shape)
