import { basename } from 'node:path'

import type { ESTree } from '@oxlint/plugins'

import {
  backendScopePattern,
  configDirectoryPattern,
  configFilenamePattern,
  constantsDirectoryPattern,
  constantsFilenamePattern,
  controllersDirectoryPattern,
  controllersFilenamePattern,
  fixturesDirectoryPattern,
  fixturesFilenamePattern,
  generatedPathPattern,
  frameworkEntrypointPattern,
  implementationPathPattern,
  handlersDirectoryPattern,
  handlersFilenamePattern,
  jobsDirectoryPattern,
  jobsFilenamePattern,
  kebabSubjectPattern,
  mailDirectoryPattern,
  routersDirectoryPattern,
  routersFilenamePattern,
  contractsDirectoryPattern,
  contractsFilenamePattern,
  mailFilenamePattern,
  middlewareDirectoryPattern,
  middlewareFilenamePattern,
  policiesDirectoryPattern,
  policiesFilenamePattern,
  relationsDirectoryPattern,
  relationsFilenamePattern,
  repositoriesDirectoryPattern,
  repositoriesFilenamePattern,
  resourcesDirectoryPattern,
  resourcesFilenamePattern,
  schemasDirectoryPattern,
  schemasFilenamePattern,
  serializersDirectoryPattern,
  serializersFilenamePattern,
  reportsDirectoryPattern,
  reportsFilenamePattern,
  servicesDirectoryPattern,
  servicesFilenamePattern,
  typesDirectoryPattern,
  typesFilenamePattern,
  upperSnakeIdentifierPattern,
  validationDirectoryPattern,
  validationFilenamePattern,
  validatorsDirectoryPattern,
  validatorsFilenamePattern,
  utilsDirectoryPattern,
  utilsFilenamePattern,
  widenedArrayNamePattern,
  camelCaseIdentifierPattern,
} from './backend-structural-ownership-constants.ts'
import type { BackendRole, TypeDeclaration } from './backend-structural-ownership-types.ts'
import { normalizeFilename } from '../shared/paths.ts'

export function sourceBase(filename: string) {
  return basename(filename).replace(/\.(?:[cm]?[jt]sx?)$/u, '')
}

export function isDeclarationFile(filename: string) {
  return /\.d\.[cm]?tsx?$/u.test(filename)
}

export function backendPath(filename: string) {
  const normalized = normalizeFilename(filename)
  const match = normalized.match(
    /(?:^|\/)(apps\/web\/(?:server|app)|packages\/(?:auth|contract|database|nuxt|sdk|ui|utils)|tooling\/[^/]+)(?:\/|$)/u,
  )
  if (match === null || match.index === undefined) return normalized
  return normalized.slice(match.index + (normalized[match.index] === '/' ? 1 : 0))
}

export function isBackendFile(filename: string) {
  const normalized = normalizeFilename(filename)
  return backendScopePattern.test(normalized) && !generatedPathPattern.test(normalized)
}

export function isTypeOwnerFile(filename: string) {
  const normalized = backendPath(filename)
  return isDeclarationFile(normalized) || typesDirectoryPattern.test(normalized)
}

export function isImplementationFile(filename: string) {
  return implementationPathPattern.test(backendPath(filename))
}

export function backendDirectoryRole(filename: string): BackendRole | null {
  const normalized = backendPath(filename)
  const base = sourceBase(normalized)
  for (const segment of normalized
    .replace(/^packages\/[^/]+\//u, '')
    .split('/')
    .slice(0, -1)) {
    if (schemasDirectoryPattern.test(segment) && relationsFilenamePattern.test(base)) {
      return 'relation'
    }
    if (controllersDirectoryPattern.test(segment)) return 'controller'
    if (routersDirectoryPattern.test(segment)) return 'router'
    if (contractsDirectoryPattern.test(segment)) return 'contract'
    if (servicesDirectoryPattern.test(segment)) return 'service'
    if (policiesDirectoryPattern.test(segment)) return 'policy'
    if (jobsDirectoryPattern.test(segment)) return 'job'
    if (handlersDirectoryPattern.test(segment)) return 'handler'
    if (middlewareDirectoryPattern.test(segment)) return 'middleware'
    if (typesDirectoryPattern.test(segment)) return 'types'
    if (utilsDirectoryPattern.test(segment)) return 'utils'
    if (constantsDirectoryPattern.test(segment)) return 'constants'
    if (fixturesDirectoryPattern.test(segment)) return 'fixtures'
    if (resourcesDirectoryPattern.test(segment)) return 'resource'
    if (schemasDirectoryPattern.test(segment)) return 'schema'
    if (relationsDirectoryPattern.test(segment)) return 'relation'
    if (validatorsDirectoryPattern.test(segment)) return 'validator'
    if (validationDirectoryPattern.test(segment)) return 'validator'
    if (repositoriesDirectoryPattern.test(segment)) return 'repository'
    if (serializersDirectoryPattern.test(segment)) return 'serializer'
    if (reportsDirectoryPattern.test(segment)) return 'report'
    if (mailDirectoryPattern.test(segment)) return 'mail'
    if (configDirectoryPattern.test(segment)) return 'config'
  }
  return null
}

export function backendRole(filename: string): BackendRole | null {
  const normalized = backendPath(filename)
  const base = sourceBase(normalized)
  const directoryRole = backendDirectoryRole(normalized)
  if (directoryRole !== null) return directoryRole
  if (configFilenamePattern.test(base)) return 'config'
  if (constantsFilenamePattern.test(base)) return 'constants'
  if (fixturesFilenamePattern.test(base)) return 'fixtures'
  if (resourcesFilenamePattern.test(base)) return 'resource'
  if (schemasFilenamePattern.test(base)) return 'schema'
  if (relationsFilenamePattern.test(base)) return 'relation'
  if (validatorsFilenamePattern.test(base) || validationFilenamePattern.test(base)) {
    return 'validator'
  }
  if (typesFilenamePattern.test(base)) return 'types'
  if (utilsFilenamePattern.test(base)) return 'utils'
  if (controllersFilenamePattern.test(base)) return 'controller'
  if (servicesFilenamePattern.test(base)) return 'service'
  if (policiesFilenamePattern.test(base)) return 'policy'
  if (jobsFilenamePattern.test(base)) return 'job'
  if (handlersFilenamePattern.test(base)) return 'handler'
  if (middlewareFilenamePattern.test(base)) return 'middleware'
  if (repositoriesFilenamePattern.test(base)) return 'repository'
  if (serializersFilenamePattern.test(base)) return 'serializer'
  if (reportsFilenamePattern.test(base)) return 'report'
  if (mailFilenamePattern.test(base)) return 'mail'
  if (routersFilenamePattern.test(base)) return 'router'
  if (contractsFilenamePattern.test(base)) return 'contract'
  return null
}

export function filenameRole(filename: string): BackendRole | null {
  const base = sourceBase(filename)
  const token = base.split(/[._-]/u).at(-1)
  if (token === undefined) return null
  if (configFilenamePattern.test(token)) return 'config'
  if (constantsFilenamePattern.test(token)) return 'constants'
  if (fixturesFilenamePattern.test(token)) return 'fixtures'
  if (resourcesFilenamePattern.test(token)) return 'resource'
  if (schemasFilenamePattern.test(token)) return 'schema'
  if (relationsFilenamePattern.test(token)) return 'relation'
  if (validatorsFilenamePattern.test(token) || validationFilenamePattern.test(token)) {
    return 'validator'
  }
  if (typesFilenamePattern.test(token)) return 'types'
  if (utilsFilenamePattern.test(token)) return 'utils'
  if (controllersFilenamePattern.test(token)) return 'controller'
  if (servicesFilenamePattern.test(token)) return 'service'
  if (policiesFilenamePattern.test(token)) return 'policy'
  if (jobsFilenamePattern.test(token)) return 'job'
  if (handlersFilenamePattern.test(token)) return 'handler'
  if (middlewareFilenamePattern.test(token)) return 'middleware'
  if (repositoriesFilenamePattern.test(token)) return 'repository'
  if (serializersFilenamePattern.test(token)) return 'serializer'
  if (reportsFilenamePattern.test(token)) return 'report'
  if (mailFilenamePattern.test(token)) return 'mail'
  if (routersFilenamePattern.test(token)) return 'router'
  if (contractsFilenamePattern.test(token)) return 'contract'
  return null
}

export function isFrameworkEntrypoint(filename: string) {
  return frameworkEntrypointPattern.test(normalizeFilename(filename))
}

export function hasAuthoredUnderscore(filename: string) {
  const normalized = backendPath(filename)
  if (isFrameworkEntrypoint(normalized)) return false
  return normalized.split('/').some((segment) => segment.includes('_'))
}

export function roleFilenameIsValid(filename: string, role: BackendRole | null) {
  if (role === null || isDeclarationFile(filename)) return true
  const base = sourceBase(filename)
  if (base === 'index') return true
  const suffix = roleSuffix(role)
  if (suffix === null || !base.endsWith(`.${suffix}`)) return false
  return kebabSubjectPattern.test(base.slice(0, -(suffix.length + 1)))
}

export function roleSuffix(role: BackendRole) {
  if (role === 'resource') return 'resource'
  if (role === 'relation') return 'relations'
  if (role === 'types') return 'types'
  if (role === 'utils') return 'utils'
  if (role === 'controller') return 'controller'
  if (role === 'service') return 'service'
  if (role === 'policy') return 'policy'
  if (role === 'job') return 'job'
  if (role === 'handler') return 'handler'
  if (role === 'middleware') return 'middleware'
  if (role === 'repository') return 'repository'
  if (role === 'serializer') return 'serializer'
  if (role === 'report') return 'report'
  if (role === 'mail') return 'mail'
  if (role === 'router') return 'router'
  if (role === 'contract') return 'contract'
  if (role === 'validator') return 'validator'
  if (role === 'fixtures') return 'fixtures'
  if (role === 'constants') return 'constants'
  if (role === 'schema') return 'schema'
  if (role === 'config') return 'config'
  return null
}

export function isClassOnlyRole(role: BackendRole | null) {
  return (
    role === 'controller' ||
    role === 'service' ||
    role === 'policy' ||
    role === 'job' ||
    role === 'handler' ||
    role === 'middleware'
  )
}

export function isTypeDeclaration(node: ESTree.Node): node is TypeDeclaration {
  return (
    node.type === 'TSEnumDeclaration' ||
    node.type === 'TSInterfaceDeclaration' ||
    node.type === 'TSTypeAliasDeclaration'
  )
}

export function isExportedTypeDeclaration(
  node: ESTree.ExportNamedDeclaration | ESTree.ExportDefaultDeclaration,
) {
  return node.declaration !== null && isTypeDeclaration(node.declaration)
}

export function isTypeOnlyExportNamedDeclaration(node: ESTree.ExportNamedDeclaration) {
  if (node.declaration !== null) return false
  if (node.specifiers.length === 0) return true
  return (
    node.exportKind === 'type' ||
    node.specifiers.every((specifier) => specifier.exportKind === 'type')
  )
}

export function isTypeOnlyExportAllDeclaration(node: ESTree.ExportAllDeclaration) {
  return node.exportKind === 'type'
}

export function isTopLevelDeclaration(node: ESTree.Node) {
  const parent = node.parent
  if (parent === null) return false
  return (
    parent.type === 'Program' ||
    ((parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration') &&
      parent.parent?.type === 'Program')
  )
}

export function functionValuedVariable(node: ESTree.VariableDeclarator) {
  return node.init?.type === 'ArrowFunctionExpression' || node.init?.type === 'FunctionExpression'
}

export function isExportedVariable(node: ESTree.VariableDeclarator) {
  return (
    node.parent.type === 'VariableDeclaration' &&
    node.parent.parent.type === 'ExportNamedDeclaration'
  )
}

export function isAllowedResourceFactory(role: BackendRole, node: ESTree.Function) {
  return (
    role === 'resource' &&
    node.parent !== null &&
    (node.parent.type === 'ExportNamedDeclaration' ||
      node.parent.type === 'ExportDefaultDeclaration') &&
    node.parent.parent?.type === 'Program'
  )
}

export function variableName(node: ESTree.VariableDeclarator) {
  return node.id.type === 'Identifier' ? node.id.name : null
}

export function isArrayInitializer(node: ESTree.VariableDeclarator) {
  const init = node.init
  if (init === null) return false
  if (init.type === 'ArrayExpression') return true
  if (init.type === 'TSAsExpression' || init.type === 'TSTypeAssertion') {
    return init.expression.type === 'ArrayExpression'
  }
  return false
}

export function isUpperSnakeIdentifier(name: string) {
  return upperSnakeIdentifierPattern.test(name)
}

export function isCamelCaseIdentifier(name: string) {
  return camelCaseIdentifierPattern.test(name)
}

export function isWidenedAliasArray(node: ESTree.VariableDeclarator) {
  const name = variableName(node)
  const objectValues =
    node.init?.type === 'CallExpression' &&
    node.init.callee.type === 'MemberExpression' &&
    !node.init.callee.computed &&
    node.init.callee.object.type === 'Identifier' &&
    node.init.callee.object.name === 'Object' &&
    node.init.callee.property.type === 'Identifier' &&
    node.init.callee.property.name === 'values'
  return (
    (isArrayInitializer(node) || objectValues) &&
    (name === null || upperSnakeIdentifierPattern.test(name) || widenedArrayNamePattern.test(name))
  )
}

export function isUnnecessaryScalarConstAssertion(node: ESTree.VariableDeclarator) {
  const init = node.init
  if (init?.type !== 'TSAsExpression' || init.typeAnnotation.type !== 'TSTypeReference') {
    return false
  }
  if (init.typeAnnotation.typeName.type !== 'Identifier') return false
  if (init.typeAnnotation.typeName.name !== 'const') return false
  return init.expression.type === 'Literal' || init.expression.type === 'TemplateLiteral'
}
