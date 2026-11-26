import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import {
  LANGUAGE_RIGHTS_ERRORS,
  PEOPLE_ONLY_ERRORS,
  RELEASE_ERRORS,
} from '../constants/contract.constants.ts'
import { draftSchema } from '../validators/drafts.validator.ts'
import {
  conflictPageSchema,
  nextReleaseSchema,
  releaseChangePageSchema,
  releaseChangeSchema,
  releaseChangesInputSchema,
  releasePageInputSchema,
  releasePageSchema,
  releaseProjectInputSchema,
  releaseSchema,
  resolveConflictInputSchema,
  undoInputSchema,
} from '../validators/releases.validator.ts'

const PEOPLE_ONLY_RELEASE_ERRORS = { ...RELEASE_ERRORS, ...PEOPLE_ONLY_ERRORS }

const PEOPLE_ONLY_CONFLICT_ERRORS = { ...LANGUAGE_RIGHTS_ERRORS, ...PEOPLE_ONLY_ERRORS }

export const releasesContract = {
  next: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/releases/next',
        operationId: 'getNextRelease',
        summary: 'See what the next release holds',
        description:
          'How many approved texts and approvals the next release writes, the release waiting to be merged, the changes held back by a conflict and when the clock releases next.',
        tags: ['releases'],
      }),
    )
    .input(releaseProjectInputSchema)
    .output(nextReleaseSchema)
    .errors(RELEASE_ERRORS),
  history: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/releases',
        operationId: 'listReleases',
        summary: 'List the releases merged into the repository',
        description: 'Newest first. Each release says who started it and what it wrote.',
        tags: ['releases'],
      }),
    )
    .input(releasePageInputSchema)
    .output(releasePageSchema)
    .errors(RELEASE_ERRORS),
  changes: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/releases/{releaseId}/changes',
        operationId: 'listReleaseChanges',
        summary: 'List the texts a release wrote',
        description:
          'Each text with the language, the text before and the text the release wrote, and whether an undo exists.',
        tags: ['releases'],
      }),
    )
    .input(releaseChangesInputSchema)
    .output(releaseChangePageSchema)
    .errors(RELEASE_ERRORS),
  run: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/releases',
        operationId: 'releaseNow',
        summary: 'Release now',
        description:
          'Write the approved texts and approvals to the release branch and open or update its pull request. Changes whose French or text changed in the repository are held back as conflicts. Owners, admins and developers. People only.',
        tags: ['releases'],
      }),
    )
    .input(releaseProjectInputSchema)
    .output(releaseSchema)
    .errors(PEOPLE_ONLY_RELEASE_ERRORS),
  undo: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/releases/{releaseId}/changes/{changeId}/undo',
        operationId: 'undoReleasedChange',
        summary: 'Undo a released text',
        description:
          'Approve a new change that restores the text from before the release, to go out with the next release. Only a merged release, only while the text is still the one it wrote. Owners, admins and developers. People only.',
        tags: ['releases'],
      }),
    )
    .input(undoInputSchema)
    .output(releaseChangeSchema)
    .errors(PEOPLE_ONLY_RELEASE_ERRORS),
  conflicts: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/conflicts',
        operationId: 'listConflicts',
        summary: 'List the changes held back by a conflict',
        description:
          'Approved changes the release cannot write because the French or the text changed in the repository since. Your own, or every one for those who approve the language.',
        tags: ['releases'],
      }),
    )
    .input(releasePageInputSchema)
    .output(conflictPageSchema)
    .errors(RELEASE_ERRORS),
  resolveConflict: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/conflicts/{draftId}',
        operationId: 'resolveConflict',
        summary: 'Keep a conflicting change or leave it out',
        description:
          'KEEP rebases the change on the text as it is now; when the French changed it goes back to review. LEAVE_OUT gives the change up. The author, or whoever approves the language. People only.',
        tags: ['releases'],
      }),
    )
    .input(resolveConflictInputSchema)
    .output(draftSchema)
    .errors(PEOPLE_ONLY_CONFLICT_ERRORS),
}
