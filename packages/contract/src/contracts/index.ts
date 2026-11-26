import { draftsContract } from './drafts.contract.ts'
import { glossaryContract } from './glossary.contract.ts'
import { healthContract } from './health.contract.ts'
import { projectsContract } from './projects.contract.ts'
import { reviewsContract } from './reviews.contract.ts'
import { textsContract } from './texts.contract.ts'

export const contract = {
  health: healthContract,
  projects: projectsContract,
  texts: textsContract,
  drafts: draftsContract,
  reviews: reviewsContract,
  glossary: glossaryContract,
}
