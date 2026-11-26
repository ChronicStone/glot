import { procedures } from '../../../config/procedures.config.ts'
import { ProjectsService } from '../services/projects.service.ts'

export const projectsRouter = {
  list: procedures.projects.list.handler(({ context }) => new ProjectsService(context).list()),
}
