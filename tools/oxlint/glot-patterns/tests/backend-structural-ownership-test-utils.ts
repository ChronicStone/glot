import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

import type {
  BackendStructuralDiagnostic,
  BackendStructuralLintResult,
} from './backend-structural-ownership-test-types.ts'

const rootDirectory = resolve(import.meta.dirname, '../../../../')
const oxlintBinary = resolve(rootDirectory, 'node_modules/.bin/oxlint')
const configPath = resolve(
  rootDirectory,
  'tools/oxlint/glot-patterns/tests/backend-structural-ownership.config.ts',
)
const fixtureDirectory = resolve(rootDirectory, 'tools/oxlint/glot-patterns/tests/fixtures')

export function lintBackendFixture(fixture: string) {
  const result = spawnSync(
    oxlintBinary,
    ['-c', configPath, '-A', 'all', '-f', 'json', resolve(fixtureDirectory, fixture)],
    {
      cwd: rootDirectory,
      encoding: 'utf8',
    },
  )
  if (result.error) throw result.error
  if (result.stdout.trim() === '') throw new Error(result.stderr)
  return JSON.parse(result.stdout) as BackendStructuralLintResult
}

export function diagnosticMessages(result: BackendStructuralLintResult) {
  return result.diagnostics.map((diagnostic: BackendStructuralDiagnostic) => diagnostic.message)
}

export function diagnosticCodes(result: BackendStructuralLintResult) {
  return result.diagnostics.map((diagnostic: BackendStructuralDiagnostic) => diagnostic.code)
}
