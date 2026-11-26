import { procedures } from '../../../config/procedures.config.ts'
import { ReleasesService } from '../services/releases.service.ts'

export const releasesRouter = {
  next: procedures.releases.next.handler(({ input, context }) =>
    new ReleasesService(context).next(input),
  ),
  history: procedures.releases.history.handler(({ input, context }) =>
    new ReleasesService(context).history(input),
  ),
  changes: procedures.releases.changes.handler(({ input, context }) =>
    new ReleasesService(context).changes(input),
  ),
  run: procedures.releases.run.handler(({ input, context }) =>
    new ReleasesService(context).run(input),
  ),
  undo: procedures.releases.undo.handler(({ input, context }) =>
    new ReleasesService(context).undo(input),
  ),
  conflicts: procedures.releases.conflicts.handler(({ input, context }) =>
    new ReleasesService(context).conflicts(input),
  ),
  resolveConflict: procedures.releases.resolveConflict.handler(({ input, context }) =>
    new ReleasesService(context).resolveConflict(input),
  ),
}
