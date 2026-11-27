import { procedures } from '../../../config/procedures.config.ts'
import { AiSettingsService } from '../services/ai-settings.service.ts'
import { AiUsageService } from '../services/ai-usage.service.ts'
import { AiService } from '../services/ai.service.ts'

export const aiRouter = {
  settings: procedures.ai.settings.handler(({ input, context }) =>
    new AiSettingsService(context).get(input),
  ),
  updateSettings: procedures.ai.updateSettings.handler(({ input, context }) =>
    new AiSettingsService(context).update(input),
  ),
  setKey: procedures.ai.setKey.handler(({ input, context }) =>
    new AiSettingsService(context).setKey(input),
  ),
  removeKey: procedures.ai.removeKey.handler(({ input, context }) =>
    new AiSettingsService(context).removeKey(input),
  ),
  usage: procedures.ai.usage.handler(({ input, context }) =>
    new AiUsageService(context).usage(input),
  ),
  suggest: procedures.ai.suggest.handler(({ input, context }) =>
    new AiService(context).suggest(input),
  ),
  fillMissing: procedures.ai.fillMissing.handler(({ input, context }) =>
    new AiService(context).fillMissing(input),
  ),
  fills: procedures.ai.fills.handler(({ input, context }) => new AiService(context).fills(input)),
}
