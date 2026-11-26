import { procedures } from '../../../config/procedures.config.ts'
import { TextsService } from '../services/texts.service.ts'

export const textsRouter = {
  search: procedures.texts.search.handler(({ input, context }) =>
    new TextsService(context).search(input),
  ),
  get: procedures.texts.get.handler(({ input, context }) => new TextsService(context).get(input)),
}
