import { procedures } from '../../../config/procedures.config.ts'
import { HomeService } from '../services/home.service.ts'

export const homeRouter = {
  overview: procedures.home.overview.handler(({ input, context }) =>
    new HomeService(context).overview(input),
  ),
}
