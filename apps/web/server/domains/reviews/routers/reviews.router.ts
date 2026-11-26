import { procedures } from '../../../config/procedures.config.ts'
import { ReviewsService } from '../services/reviews.service.ts'

export const reviewsRouter = {
  rights: procedures.reviews.rights.handler(({ input, context }) =>
    new ReviewsService(context).rights(input.projectId),
  ),
  queue: procedures.reviews.queue.handler(({ input, context }) =>
    new ReviewsService(context).queue(input),
  ),
  approve: procedures.reviews.approve.handler(({ input, context }) =>
    new ReviewsService(context).approve(input),
  ),
  editAndApprove: procedures.reviews.editAndApprove.handler(({ input, context }) =>
    new ReviewsService(context).editAndApprove(input),
  ),
  approveSame: procedures.reviews.approveSame.handler(({ input, context }) =>
    new ReviewsService(context).approveSame(input),
  ),
  requestChange: procedures.reviews.requestChange.handler(({ input, context }) =>
    new ReviewsService(context).requestChange(input),
  ),
  comment: procedures.reviews.comment.handler(({ input, context }) =>
    new ReviewsService(context).comment(input),
  ),
  comments: procedures.reviews.comments.handler(({ input, context }) =>
    new ReviewsService(context).comments(input),
  ),
}
