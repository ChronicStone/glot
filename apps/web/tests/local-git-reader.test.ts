import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, test } from 'vite-plus/test'
import { LocalGitReader } from '../server/domains/catalogs/services/local-git-reader.service.ts'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'glot-reader-'))
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

test('a git that exits before reading its input reports its own message, not a broken pipe', async () => {
  const reader = new LocalGitReader({ root })
  const paths = Array.from({ length: 4000 }, (_unused, index) => `locales/${index}/messages.json`)

  await expect(reader.files({ repository: 'glot/missing', commit: 'main', paths })).rejects.toThrow(
    /Cannot read glot\/missing: .*cannot change to/u,
  )
})
