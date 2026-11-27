import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { avoidWordsSchema } from '../validators/avoid.validator.ts'
import type { CheckArguments } from '../types/cli.types.ts'
import { checkCatalog, languagePath } from '../utils/check-catalog.utils.ts'

export class CheckService {
  async run(options: CheckArguments) {
    const avoid = options.avoidFile
      ? avoidWordsSchema.parse(
          JSON.parse(await readFile(join(options.root, options.avoidFile), 'utf8')),
        )
      : {}

    const results = await Promise.all(
      options.patterns.map(async (pattern) =>
        checkCatalog({
          files: await this.#read({ options, pattern }),
          pattern,
          sourceLanguage: options.sourceLanguage,
          languages: options.languages,
          avoid,
        }),
      ),
    )

    return {
      checked: results.reduce((total, { checked }) => total + checked, 0),
      failures: results.flatMap(({ failures }) => failures),
    }
  }

  async #read(options: { options: CheckArguments; pattern: string }) {
    const files = new Map<string, string>()
    const { sourceLanguage, languages, root } = options.options

    await Promise.all(
      [...new Set([sourceLanguage, ...languages])].map(async (language) => {
        const path = languagePath({ pattern: options.pattern, language })

        try {
          files.set(path, await readFile(join(root, path), 'utf8'))
        } catch (error) {
          if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
            throw error
          }

          if (language === sourceLanguage) {
            throw new Error(`${path} is missing: it holds the source texts.`)
          }
        }
      }),
    )

    return files
  }
}
