import { procedures } from '../../../config/procedures.config.ts'
import { ContributionsService } from '../services/contributions.service.ts'

export const contributionsRouter = {
  monthly: procedures.reports.monthly.handler(({ input, context }) =>
    new ContributionsService(context).monthly(input),
  ),
}
