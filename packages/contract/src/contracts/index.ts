import { draftsContract } from './drafts.contract.ts'
import { glossaryContract } from './glossary.contract.ts'
import { healthContract } from './health.contract.ts'
import { homeContract } from './home.contract.ts'
import { peopleContract } from './people.contract.ts'
import { projectsContract } from './projects.contract.ts'
import { releasesContract } from './releases.contract.ts'
import { reportsContract } from './reports.contract.ts'
import { reviewsContract } from './reviews.contract.ts'
import { textsContract } from './texts.contract.ts'

export const contract = {
  health: healthContract,
  projects: projectsContract,
  texts: textsContract,
  drafts: draftsContract,
  reviews: reviewsContract,
  releases: releasesContract,
  glossary: glossaryContract,
  people: peopleContract,
  home: homeContract,
  reports: reportsContract,
}
