import { draftsRouter } from '../../drafts/routers/drafts.router.ts'
import { textsRouter } from '../../texts/routers/texts.router.ts'
import { widgetRouter } from './widget.router.ts'

export const widgetSurfaceRouter = {
  texts: { get: textsRouter.get, byKeys: textsRouter.byKeys },
  drafts: draftsRouter,
  widget: widgetRouter,
}
