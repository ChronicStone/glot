import { procedures } from '../../../config/procedures.config.ts'
import { PeopleService } from '../services/people.service.ts'

export const peopleRouter = {
  list: procedures.people.list.handler(({ input, context }) =>
    new PeopleService(context).list(input),
  ),
  me: procedures.people.me.handler(({ input, context }) => new PeopleService(context).me(input)),
  preferences: procedures.people.preferences.handler(({ context }) =>
    new PeopleService(context).preferences(),
  ),
  updatePreferences: procedures.people.updatePreferences.handler(({ input, context }) =>
    new PeopleService(context).updatePreferences(input),
  ),
  invite: procedures.people.invite.handler(({ input, context }) =>
    new PeopleService(context).invite(input),
  ),
  update: procedures.people.update.handler(({ input, context }) =>
    new PeopleService(context).update(input),
  ),
  remove: procedures.people.remove.handler(({ input, context }) =>
    new PeopleService(context).remove(input),
  ),
}
