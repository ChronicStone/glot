import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

test('authored inputs are short, native contracts remain valid, and spacing is fixable', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'glot-readability-'))
  const file = resolve(directory, 'example.middleware.ts')
  const root = resolve(import.meta.dirname, '../../../..')
  const config = resolve(import.meta.dirname, 'function-readability.config.ts')
  const binary = resolve(root, 'node_modules/.bin/oxlint')

  try {
    writeFileSync(
      file,
      `
function link(tx: Transaction, a: string, b: string) {}
function rename(id: string, name: string) {}
function nullable(value: string | number, currency: 'EUR' | 'USD' | null) {}
function defaults(prefix = 'entry', count = 1) {}
function update(tx: Transaction, input: { id: string; name: string }) {}
function bind(this: HttpContext, transformer: Transformer, value: Resource) {}
function privateHelper(a: string, b: number, c: boolean) {}
class Service {
  execute(a: string, b: string, c: string) {}
  override handle(a: string, b: string, c: string) {}
}
@inject()
class Controller {
  constructor(a: Service, b: Service, c: Service) {}
}
class Middleware {
  handle(ctx: HttpContext, next: NextFn, options: { role: string }) {}
}
items.map((value, index, source) => source[index])
function totals(input: { value: number; rate: number }) {
  const amount = input.value
  const rate = input.rate
  if (!rate) throw new Error('Rate required')
  const result = amount * rate
  return result
}
`,
    )
    const first = spawnSync(
      binary,
      ['-c', config, '-A', 'all', '-D', 'curly', '-f', 'json', file],
      {
        encoding: 'utf8',
      },
    )
    const diagnostics = JSON.parse(first.stdout).diagnostics

    assert.equal(
      diagnostics.filter((item: { code: string }) =>
        item.code.includes('authored-function-parameters'),
      ).length,
      6,
    )
    assert.equal(
      diagnostics.filter((item: { code: string }) => item.code.includes('logical-code-spacing'))
        .length,
      3,
    )

    spawnSync(
      binary,
      ['-c', config, '-A', 'all', '-D', 'curly', '--fix', '--fix-suggestions', '-f', 'json', file],
      {
        encoding: 'utf8',
      },
    )

    const fixed = spawnSync(
      binary,
      ['-c', config, '-A', 'all', '-D', 'curly', '--fix', '--fix-suggestions', '-f', 'json', file],
      { encoding: 'utf8' },
    )

    assert.equal(JSON.parse(fixed.stdout).diagnostics.length, 6)
    assert.match(readFileSync(file, 'utf8'), /const rate = input.rate\n\s*\n\s*if/u)
    assert.match(readFileSync(file, 'utf8'), /if \(!rate\) \{\s*throw/u)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
