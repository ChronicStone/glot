import type { Approval, Draft } from '@glot/database'
import type { Catalog, CatalogProject } from '../../catalogs/types/catalog.types.ts'
import { renderFiles } from './release-files.utils.ts'
import { planRelease } from './release-plan.utils.ts'

export function releaseFiles(options: {
  project: CatalogProject
  catalog: Catalog
  drafts: Draft[]
  approvals: Approval[]
  files: Map<string, string>
}) {
  const { project, catalog, drafts, approvals, files } = options
  const excluded = new Set<string>()
  let plan = planRelease({ catalog, drafts, approvals, excluded })
  let rendered = renderFiles({ project, plan, files })

  while (rendered.unwritable.length > 0) {
    rendered.unwritable.forEach(({ id }) => excluded.add(id))
    plan = planRelease({ catalog, drafts, approvals, excluded })
    rendered = renderFiles({ project, plan, files })
  }

  return { plan, files: rendered.files }
}
