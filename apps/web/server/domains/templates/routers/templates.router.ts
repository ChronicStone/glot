import { procedures } from '../../../config/procedures.config.ts'
import { TemplatesService } from '../services/templates.service.ts'

export const templatesRouter = {
  list: procedures.templates.list.handler(({ input, context }) =>
    new TemplatesService(context).list(input),
  ),
  texts: procedures.templates.texts.handler(({ input, context }) =>
    new TemplatesService(context).texts(input),
  ),
  preview: procedures.templates.preview.handler(({ input, context }) =>
    new TemplatesService(context).preview(input),
  ),
  sendTest: procedures.templates.sendTest.handler(({ input, context }) =>
    new TemplatesService(context).sendTest(input),
  ),
}
