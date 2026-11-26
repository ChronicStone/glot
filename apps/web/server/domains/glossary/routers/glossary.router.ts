import { procedures } from '../../../config/procedures.config.ts'
import { GlossaryService } from '../services/glossary.service.ts'

export const glossaryRouter = {
  list: procedures.glossary.list.handler(({ input, context }) =>
    new GlossaryService(context).list(input),
  ),
}
