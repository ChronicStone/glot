import { DEMO_GLOSSARY } from '../domains/catalogs/fixtures/demo.fixtures.ts'
import { CatalogService } from '../domains/catalogs/services/catalog.service.ts'
import { GithubGitReader } from '../domains/catalogs/services/github-git-reader.service.ts'
import { LocalGitReader } from '../domains/catalogs/services/local-git-reader.service.ts'
import { env } from '../env.ts'

export const git = env.GLOT_GIT_ROOT
  ? new LocalGitReader({ root: env.GLOT_GIT_ROOT })
  : new GithubGitReader({ token: env.GITHUB_TOKEN })

export const catalog = new CatalogService({ reader: git, glossary: DEMO_GLOSSARY })
