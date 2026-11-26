import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

const FILES = {
  'apps/web/app/entities/example/table.tsx': `
export const columns = [
  { key: 'amount', align: 'right' },
  { key: 'name', align: 'left' },
  { key: 'status', align: 'center' },
]
`,
  'apps/web/app/entities/example/render.tsx': `
export const amount = <span class="block text-right tabular-nums">12</span>
export const total = <span class={['inline-flex md:justify-end', 'font-medium']}>12</span>
export const label = <span class={\`truncate \${'text-muted'} justify-self-end\`}>12</span>
export const plain = <span class="flex justify-between text-left">12</span>
`,
  'apps/web/app/components/layout/Toolbar.tsx': `
export const toolbar = <div class="flex justify-end">actions</div>
export const column = { key: 'total', align: 'right' }
`,
}

test('right-aligned columns and entity cells are rejected, other layouts are not', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'glot-alignment-'))
  const root = resolve(import.meta.dirname, '../../../..')
  const config = resolve(import.meta.dirname, 'no-right-aligned-cells.config.ts')
  const binary = resolve(root, 'node_modules/.bin/oxlint')

  try {
    const paths = Object.entries(FILES).map(([path, source]) => {
      const file = resolve(directory, path)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, source)
      return file
    })
    const result = spawnSync(binary, ['-c', config, '-A', 'all', '-f', 'json', ...paths], {
      encoding: 'utf8',
    })
    const diagnostics: { code: string; filename: string; message: string }[] = JSON.parse(
      result.stdout,
    ).diagnostics.filter((item: { code: string }) => item.code.includes('no-right-aligned-cells'))
    const byFile = (suffix: string) =>
      diagnostics.filter((item) => item.filename.endsWith(suffix)).map((item) => item.message)

    assert.equal(byFile('table.tsx').length, 1)
    assert.deepEqual(
      byFile('render.tsx').map((message) => message.match(/`([^`]+)`/u)?.[1]),
      ['text-right', 'justify-end', 'justify-self-end'],
    )
    assert.deepEqual(byFile('Toolbar.tsx'), [
      "Table columns never align right, numbers included. Remove `align: 'right'`.",
    ])
  } finally {
    rmSync(directory, { force: true, recursive: true })
  }
})
