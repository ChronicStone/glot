import { procedures } from '../../../config/procedures.config.ts'
import { GlossaryService } from '../services/glossary.service.ts'

export const glossaryRouter = {
  list: procedures.glossary.list.handler(({ input, context }) =>
    new GlossaryService(context).list(input),
  ),
  listConcepts: procedures.glossary.listConcepts.handler(({ input, context }) =>
    new GlossaryService(context).listConcepts(input),
  ),
  createConcept: procedures.glossary.createConcept.handler(({ input, context }) =>
    new GlossaryService(context).createConcept(input),
  ),
  updateConcept: procedures.glossary.updateConcept.handler(({ input, context }) =>
    new GlossaryService(context).updateConcept(input),
  ),
  setConceptStatus: procedures.glossary.setConceptStatus.handler(({ input, context }) =>
    new GlossaryService(context).setConceptStatus(input),
  ),
  removeConcept: procedures.glossary.removeConcept.handler(({ input, context }) =>
    new GlossaryService(context).removeConcept(input),
  ),
}
