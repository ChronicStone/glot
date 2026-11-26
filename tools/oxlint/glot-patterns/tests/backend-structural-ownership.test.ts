import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  diagnosticCodes,
  diagnosticMessages,
  lintBackendFixture,
} from './backend-structural-ownership-test-utils.ts'

describe('backend structural ownership', () => {
  it('accepts classes, imported contracts, methods, callbacks, and inferred typefile contracts', () => {
    for (const fixture of [
      'apps/web/server/domains/example/controllers/valid.controller.ts',
      'apps/web/server/domains/example/services/valid.service.ts',
      'apps/web/server/domains/example/services/date.service.ts',
      'apps/web/server/domains/example/policies/example.policy.ts',
      'apps/web/server/domains/example/jobs/example.job.ts',
      'apps/web/server/domains/example/handlers/example.handler.ts',
      'apps/web/server/middleware/valid-example.middleware.ts',
      'apps/web/server/domains/example/resources/example.resource.ts',
      'apps/web/server/domains/example/constants/example.constants.ts',
      'apps/web/server/domains/example/utils/example.utils.ts',
      'apps/web/server/domains/example/routers/example.router.ts',
      'packages/database/src/schemas/example/example.schema.ts',
      'packages/database/src/schemas/example/example.relations.ts',
      'packages/database/src/types/example.types.ts',
      'apps/web/server/domains/example/types/legacy.types.ts',
      'packages/database/src/types/type-reexports.types.ts',
      'apps/web/server/types/framework-services.d.ts',
      'apps/web/server/types/middleware/view.types.ts',
      'apps/web/server/domains/example/types/jobs/job.types.ts',
      'apps/web/server/domains/example/utils/jobs/job.utils.ts',
      'packages/database/drizzle.config.ts',
      'packages/utils/src/types/index.ts',

      'packages/auth/generated/schema.generated.ts',
      'packages/auth/generated/example.serializer.ts',
      'packages/database/migrations/20260916_bad_generated_name/legacy_types.ts',
    ]) {
      assert.deepEqual(lintBackendFixture(fixture).diagnostics, [])
    }
  })

  it('rejects helpers in router files', () => {
    const result = lintBackendFixture('apps/web/server/domains/example/routers/bad.router.ts')
    assert.ok(result.diagnostics.length > 0)
  })

  it('rejects helpers beside a task handler class', () => {
    const result = lintBackendFixture('apps/web/server/domains/example/handlers/bad.handler.ts')
    assert.equal(result.diagnostics.length, 1)
  })

  it('rejects loose controller declarations', () => {
    const result = lintBackendFixture(
      'apps/web/server/domains/example/controllers/bad.controller.ts',
    )
    assert.equal(result.diagnostics.length, 3)
    assert.equal(
      diagnosticCodes(result).every(
        (code) => code === 'glot-patterns(backend-structural-ownership)',
      ),
      true,
    )
    assert.equal(
      diagnosticMessages(result).some((message) =>
        message.includes('only imports, type-only exports'),
      ),
      true,
    )
    assert.equal(
      diagnosticMessages(result).some((message) => message.includes('Named type declarations')),
      true,
    )
  })

  it('accepts inline parameter annotations and native generic configuration', () => {
    for (const fixture of [
      'apps/web/server/domains/example/services/inline-contract.service.ts',
      'packages/database/src/schemas/example/inline.schema.ts',
    ]) {
      assert.deepEqual(lintBackendFixture(fixture).diagnostics, [])
    }
  })

  it('rejects resource helpers without forcing inline contracts into files', () => {
    const result = lintBackendFixture('apps/web/server/domains/example/resources/bad.resource.ts')
    assert.equal(result.diagnostics.length, 1)
    assert.ok(result.diagnostics[0]?.message.includes('Move helpers'))
  })

  it('rejects type and helper adjacency in policy and service files', () => {
    const policyResult = lintBackendFixture(
      'apps/web/server/domains/example/policies/legacy.policy.ts',
    )
    const importerResult = lintBackendFixture(
      'apps/web/server/domains/example/services/importer.service.ts',
    )
    assert.equal(policyResult.diagnostics.length, 2)
    assert.equal(
      diagnosticMessages(policyResult).some((message) =>
        message.includes('only imports, type-only exports'),
      ),
      true,
    )
    assert.equal(
      diagnosticMessages(policyResult).some((message) =>
        message.includes('Named type declarations'),
      ),
      true,
    )
    assert.equal(importerResult.diagnostics.length, 1)
    assert.equal(importerResult.diagnostics[0]?.message.includes('Named type declarations'), true)
  })

  it('rejects type owners outside the types directory', () => {
    const result = lintBackendFixture('apps/web/server/domains/example/legacy.types.ts')
    assert.equal(result.diagnostics.length, 2)
    assert.equal(
      diagnosticMessages(result).some((message) => message.includes('role directory')),
      true,
    )
    assert.equal(
      diagnosticMessages(result).some((message) => message.includes('Named type declarations')),
      true,
    )
  })

  it('rejects named relation helpers and non-camel library objects', () => {
    const relationResult = lintBackendFixture(
      'packages/database/src/schemas/example/bad.relations.ts',
    )
    const libraryResult = lintBackendFixture(
      'packages/database/src/schemas/example/invalid-names.schema.ts',
    )
    assert.equal(relationResult.diagnostics.length, 1)
    assert.equal(
      relationResult.diagnostics[0]?.message.includes('native builder declarations'),
      true,
    )
    assert.equal(libraryResult.diagnostics.length, 1)
    assert.equal(libraryResult.diagnostics[0]?.message.includes('camelCase'), true)
  })

  it('requires semantic constant names and canonical records', () => {
    const result = lintBackendFixture(
      'apps/web/server/domains/example/constants/invalid.constants.ts',
    )
    assert.equal(result.diagnostics.length, 3)
    assert.equal(
      diagnosticMessages(result).some((message) => message.includes('UPPER_SNAKE_CASE')),
      true,
    )
    assert.equal(
      diagnosticMessages(result).some((message) => message.includes('exported record')),
      true,
    )
    assert.equal(
      diagnosticMessages(result).some((message) => message.includes('unnecessary `as const`')),
      true,
    )
  })

  it('rejects underscores in authored backend paths', () => {
    const result = lintBackendFixture('apps/web/server/domains/example/utils/legacy_helper.ts')
    assert.equal(result.diagnostics.length, 2)
    assert.equal(
      diagnosticMessages(result).some((message) => message.includes('kebab-case names')),
      true,
    )
    assert.equal(
      diagnosticMessages(result).some((message) => message.includes('dotted role suffix')),
      true,
    )
  })

  it('rejects runtime declarations and nested types in type owners', () => {
    const runtimeResult = lintBackendFixture('packages/database/src/types/bad.types.ts')
    const nestedResult = lintBackendFixture('packages/database/src/types/nested.types.ts')
    const enumResult = lintBackendFixture('packages/database/src/types/runtime-enum.types.ts')
    const reexportResult = lintBackendFixture(
      'packages/database/src/types/value-reexports.types.ts',
    )
    assert.equal(runtimeResult.diagnostics.length, 1)
    assert.equal(
      runtimeResult.diagnostics[0]?.message.includes('type declarations and type exports only'),
      true,
    )
    assert.equal(nestedResult.diagnostics.length, 2)
    assert.equal(
      diagnosticMessages(nestedResult).some((message) => message.includes('top level')),
      true,
    )
    assert.equal(enumResult.diagnostics.length, 1)
    assert.equal(
      enumResult.diagnostics[0]?.message.includes('type declarations and type exports only'),
      true,
    )
    assert.equal(reexportResult.diagnostics.length, 2)
    assert.equal(
      diagnosticMessages(reexportResult).every((message) =>
        message.includes('type declarations and type exports only'),
      ),
      true,
    )
  })

  it('rejects helpers in constants and ambient modules in ts files', () => {
    const constantsResult = lintBackendFixture(
      'apps/web/server/domains/example/constants/bad.constants.ts',
    )
    const ambientResult = lintBackendFixture('apps/web/server/config/ambient.config.ts')
    assert.equal(constantsResult.diagnostics.length, 2)
    assert.equal(ambientResult.diagnostics.length, 1)
    assert.equal(ambientResult.diagnostics[0]?.message.includes('`.d.ts`'), true)
  })
})
