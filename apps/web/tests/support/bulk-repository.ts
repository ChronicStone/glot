import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

export async function seedBulkRepository(options: {
  root: string
  repository: string
  count: number
}) {
  const directory = join(options.root, options.repository)

  const messages: Record<string, string> = {
    greeting: 'Bonjour {name}',
    offers: 'Voir <b>{count}</b> offres',
    lots: '{count} lot | {count} lots',
  }

  for (let index = 0; index < options.count - 3; index += 1) {
    messages[`text${index}`] = `Texte numéro ${index}`
  }

  await rm(directory, { recursive: true, force: true })
  await mkdir(join(directory, 'i18n'), { recursive: true })
  await writeFile(join(directory, 'i18n/fr.json'), `${JSON.stringify(messages, null, 2)}\n`)
  await writeFile(join(directory, 'i18n/pl.json'), '{}\n')
  await writeFile(
    join(directory, 'i18n/en.json'),
    `${JSON.stringify({ greeting: 'Hello {name}' })}\n`,
  )
  await run('git', ['-C', directory, 'init', '--initial-branch', 'main'])
  await run('git', ['-C', directory, 'add', '--all'])

  await run('git', [
    '-C',
    directory,
    '-c',
    'user.name=Bulk',
    '-c',
    'user.email=bulk@glot.test',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--message',
    'Add the bulk texts',
  ])

  return { directory }
}
