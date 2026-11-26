import { procedures } from '../../../config/procedures.config.ts'
import { DraftsService } from '../services/drafts.service.ts'

export const draftsRouter = {
  save: procedures.drafts.save.handler(({ input, context }) =>
    new DraftsService(context).save(input),
  ),
  send: procedures.drafts.send.handler(({ input, context }) =>
    new DraftsService(context).send(input),
  ),
  withdraw: procedures.drafts.withdraw.handler(({ input, context }) =>
    new DraftsService(context).withdraw(input),
  ),
}
