import { oc } from '@orpc/contract'
import { openapi } from '@orpc/openapi'
import * as z from 'zod'
import { LANGUAGE_RIGHTS_ERRORS, PEOPLE_ONLY_ERRORS } from '../constants/contract.constants.ts'
import {
  approveInputSchema,
  approveSameInputSchema,
  approveSameSchema,
  commentInputSchema,
  commentSchema,
  editAndApproveInputSchema,
  queueInputSchema,
  queueSchema,
  requestChangeInputSchema,
  reviewTargetInputSchema,
  rightsInputSchema,
  rightsSchema,
} from '../validators/reviews.validator.ts'
import { textSchema } from '../validators/texts.validator.ts'

const PEOPLE_ONLY_REVIEW_ERRORS = { ...LANGUAGE_RIGHTS_ERRORS, ...PEOPLE_ONLY_ERRORS }

export const reviewsContract = {
  rights: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/rights',
        operationId: 'getMyLanguages',
        summary: 'The languages I write and approve',
        description:
          'The languages of this project the caller can write and the ones they can approve.',
        tags: ['reviews'],
      }),
    )
    .input(rightsInputSchema)
    .output(rightsSchema)
    .errors(LANGUAGE_RIGHTS_ERRORS),
  queue: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/reviews',
        operationId: 'listReviewQueue',
        summary: 'List the texts to review in a language',
        description:
          'Drafts sent for review and texts to check in one language, most seen first, each with the reason it is there. Needs the right to approve the language.',
        tags: ['reviews'],
      }),
    )
    .input(queueInputSchema)
    .output(queueSchema)
    .errors(LANGUAGE_RIGHTS_ERRORS),
  approve: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/reviews',
        operationId: 'approveText',
        summary: 'Approve a text',
        description:
          'Approve one text in one language against its current source text, or a draft sent for review. When the language has two reviewers or more, the author of a draft cannot approve it; alone, the approval is marked self-approved. People only.',
        tags: ['reviews'],
      }),
    )
    .input(approveInputSchema)
    .output(textSchema)
    .errors(PEOPLE_ONLY_REVIEW_ERRORS),
  editAndApprove: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/reviews/edit',
        operationId: 'editAndApproveText',
        summary: 'Correct a text and approve it',
        description:
          'Replace the text with the reviewer correction and approve it. The same approval rules apply as for a draft the reviewer wrote. People only.',
        tags: ['reviews'],
      }),
    )
    .input(editAndApproveInputSchema)
    .output(textSchema)
    .errors(PEOPLE_ONLY_REVIEW_ERRORS),
  approveSame: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/reviews/same',
        operationId: 'approveSameTexts',
        summary: 'Approve the texts already approved elsewhere',
        description:
          'Approve every text to check in a language whose source text and target text are already approved together on another text. People only.',
        tags: ['reviews'],
      }),
    )
    .input(approveSameInputSchema)
    .output(approveSameSchema)
    .errors(PEOPLE_ONLY_REVIEW_ERRORS),
  requestChange: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/reviews/change',
        operationId: 'requestChange',
        summary: 'Ask for a change',
        description:
          'Ask for a change with a comment. A draft sent for review goes back to its author. People only.',
        tags: ['reviews'],
      }),
    )
    .input(requestChangeInputSchema)
    .output(commentSchema)
    .errors(PEOPLE_ONLY_REVIEW_ERRORS),
  comment: oc
    .meta(
      openapi({
        method: 'POST',
        path: '/projects/{projectId}/comments',
        operationId: 'commentOnText',
        summary: 'Comment on a text',
        tags: ['reviews'],
      }),
    )
    .input(commentInputSchema)
    .output(commentSchema)
    .errors(LANGUAGE_RIGHTS_ERRORS),
  comments: oc
    .meta(
      openapi({
        method: 'GET',
        path: '/projects/{projectId}/comments',
        operationId: 'listComments',
        summary: 'List the comments on a text in one language',
        tags: ['reviews'],
      }),
    )
    .input(reviewTargetInputSchema)
    .output(z.array(commentSchema))
    .errors(LANGUAGE_RIGHTS_ERRORS),
}
