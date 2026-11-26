import type { ESTree } from '@oxlint/plugins'

export type BackendRole =
  | 'config'
  | 'constants'
  | 'fixtures'
  | 'resource'
  | 'schema'
  | 'relation'
  | 'validator'
  | 'types'
  | 'utils'
  | 'controller'
  | 'service'
  | 'policy'
  | 'job'
  | 'handler'
  | 'middleware'
  | 'repository'
  | 'serializer'
  | 'report'
  | 'mail'
  | 'router'
  | 'contract'

export type TypeDeclaration =
  | ESTree.TSEnumDeclaration
  | ESTree.TSInterfaceDeclaration
  | ESTree.TSTypeAliasDeclaration
