import { procedures } from './config/procedures.config.ts'
import { aiRouter } from './domains/ai/routers/ai.router.ts'
import { draftsRouter } from './domains/drafts/routers/drafts.router.ts'
import { glossaryRouter } from './domains/glossary/routers/glossary.router.ts'
import { healthRouter } from './domains/health/routers/health.router.ts'
import { homeRouter } from './domains/home/routers/home.router.ts'
import { peopleRouter } from './domains/people/routers/people.router.ts'
import { projectsRouter } from './domains/projects/routers/projects.router.ts'
import { releasesRouter } from './domains/releases/routers/releases.router.ts'
import { contributionsRouter } from './domains/contributions/routers/contributions.router.ts'
import { reviewsRouter } from './domains/reviews/routers/reviews.router.ts'
import { textsRouter } from './domains/texts/routers/texts.router.ts'
import { widgetRouter } from './domains/widget/routers/widget.router.ts'

export const router = procedures.router({
  health: healthRouter,
  projects: projectsRouter,
  texts: textsRouter,
  drafts: draftsRouter,
  reviews: reviewsRouter,
  releases: releasesRouter,
  glossary: glossaryRouter,
  people: peopleRouter,
  home: homeRouter,
  reports: contributionsRouter,
  widget: widgetRouter,
  ai: aiRouter,
})
