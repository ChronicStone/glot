import { PREVIEW_ADAPTER } from '../domains/templates/constants/templates.constants.ts'
import { PreviewAdapterService } from '../domains/templates/services/preview-adapter.service.ts'

export const previews = new PreviewAdapterService({ timeoutMs: PREVIEW_ADAPTER.TIMEOUT_MS })
