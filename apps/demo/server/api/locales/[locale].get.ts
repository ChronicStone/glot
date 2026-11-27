import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

async function readLocale(options: { repository: string; file: string; branches: string[] }) {
  for (const branch of options.branches) {
    const found = await run('git', ['-C', options.repository, 'show', `${branch}:${options.file}`])
      .then(({ stdout }) => stdout)
      .catch(() => null)

    if (found !== null) {
      return found
    }
  }

  return null
}

export default defineEventHandler(async (event) => {
  const locale = getRouterParam(event, 'locale') ?? ''
  const { locales } = useRuntimeConfig(event)

  if (!/^[a-z]{2}(-[A-Z]{2})?$/u.test(locale) || !locales.repository) {
    throw createError({ statusCode: 404 })
  }

  const content = await readLocale({
    repository: locales.repository,
    file: `${locales.folder}/${locale}.json`,
    branches: locales.branches.split(','),
  })

  if (content === null) {
    throw createError({ statusCode: 404 })
  }

  setResponseHeader(event, 'cache-control', 'no-store')

  return JSON.parse(content)
})
