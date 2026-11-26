import { procedures } from '../../../config/procedures.config.ts'
import { ReviewsService } from '../services/reviews.service.ts'

export const reviewsRouter = {
  approve: procedures.reviews.approve.handler(({ input, context }) =>
    new ReviewsService(context).approve(input),
  ),
}
