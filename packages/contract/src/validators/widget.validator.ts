import { projectSelectSchema } from '@glot/database/validators/projects'
import { userSelectSchema } from '@glot/database/validators/users'
import * as z from 'zod'
import { languageCodeSchema } from './languages.validator.ts'

export const widgetTokenInputSchema = z.object({
  origin: z
    .url()
    .describe('The origin of the app the widget runs in, such as https://uat.market.example.com.'),
  repository: projectSelectSchema.shape.repository.describe(
    "The repository of the project the app shows, as set in the app's Glot module.",
  ),
})

export const widgetSessionSchema = z.object({
  token: z
    .string()
    .describe('A bearer token for /widget/rpc, valid one hour, for this project and origin only.'),
  expiresAt: z.date(),
  project: projectSelectSchema.pick({
    id: true,
    name: true,
    repository: true,
    sourceLanguage: true,
    languages: true,
  }),
  member: userSelectSchema.pick({ id: true, name: true, email: true }),
  languages: z
    .array(languageCodeSchema)
    .describe('The languages this person changes in the project.'),
})
