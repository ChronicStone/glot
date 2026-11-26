import { procedures } from './config/procedures.config.ts'
import { draftsRouter } from './domains/drafts/routers/drafts.router.ts'
import { glossaryRouter } from './domains/glossary/routers/glossary.router.ts'
import { healthRouter } from './domains/health/routers/health.router.ts'
import { projectsRouter } from './domains/projects/routers/projects.router.ts'
import { reviewsRouter } from './domains/reviews/routers/reviews.router.ts'
import { textsRouter } from './domains/texts/routers/texts.router.ts'

export const router = procedures.router({
  health: healthRouter,
  projects: projectsRouter,
  texts: textsRouter,
  drafts: draftsRouter,
  reviews: reviewsRouter,
  glossary: glossaryRouter,
})
