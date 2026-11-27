import type * as z from 'zod'
import type { widgetSessionSchema, widgetTokenInputSchema } from '../validators/widget.validator.ts'

export type WidgetTokenInput = z.infer<typeof widgetTokenInputSchema>

export type WidgetSession = z.infer<typeof widgetSessionSchema>
