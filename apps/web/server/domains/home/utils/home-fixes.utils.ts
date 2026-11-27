import type { Text } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'

export function fixesOf(options: {
  texts: Text[]
  languages: string[]
  project: { id: string; name: string }
}) {
  const { project } = options

  return options.texts.flatMap((text) =>
    text.translations.flatMap((translation) => {
      const [reason] = translation.failures

      return translation.state === TEXT_STATES.NEEDS_FIX &&
        reason &&
        options.languages.includes(translation.language)
        ? [
            {
              projectId: project.id,
              projectName: project.name,
              textId: text.id,
              key: text.key,
              source: text.source,
              language: translation.language,
              value: translation.value,
              reason,
              shownIn: text.shownIn,
            },
          ]
        : []
    }),
  )
}
