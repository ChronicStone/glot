import { procedures } from '../../../config/procedures.config.ts'

export const exampleRouter = {
  list: procedures.example.list.handler(({ context }) => context.items),
}
