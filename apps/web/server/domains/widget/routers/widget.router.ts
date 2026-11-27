import { procedures } from '../../../config/procedures.config.ts'
import { WidgetService } from '../services/widget.service.ts'

export const widgetRouter = {
  token: procedures.widget.token.handler(({ input, context }) =>
    new WidgetService(context).token(input),
  ),
}
