import { RELEASE_TITLE } from '../constants/releases.constants.ts'
import type { ReleasePlan } from '../types/releases.types.ts'

export function releaseMessage(plan: Pick<ReleasePlan, 'changes' | 'lines'>) {
  const perLanguage = Map.groupBy(plan.changes, ({ draft }) => draft.language)

  const body = [
    `${plan.changes.length} ${plan.changes.length === 1 ? 'text' : 'texts'}, ${plan.lines.length} ${plan.lines.length === 1 ? 'approval' : 'approvals'}.`,
    ...[...perLanguage]
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([language, changes]) => `${language}: ${changes.length}`),
  ].join('\n')

  return { title: RELEASE_TITLE, body, commit: `${RELEASE_TITLE}\n\n${body}` }
}
