import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import { WIDGET_ERRORS } from '../constants/contract.constants.ts'
import { widgetSessionSchema, widgetTokenInputSchema } from '../validators/widget.validator.ts'

export const widgetContract = {
  token: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/widget/token',
        operationId: 'issueWidgetToken',
        summary: 'Sign the in-app widget in',
        description:
          "Give the widget running in one of the project's apps a token for that project, valid one hour. Only a signed-in member of the project's workspace gets one, and only for an app origin the server allows.",
        tags: ['widget'],
      }),
    )
    .input(widgetTokenInputSchema)
    .output(widgetSessionSchema)
    .errors(WIDGET_ERRORS),
}
