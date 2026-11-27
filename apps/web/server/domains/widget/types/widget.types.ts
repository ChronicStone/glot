import type * as z from 'zod'
import type { widgetClaimsSchema } from '../validators/widget.validator.ts'

export type WidgetClaims = z.infer<typeof widgetClaimsSchema>

export type WidgetScope = Pick<WidgetClaims, 'projectId' | 'origin'>
