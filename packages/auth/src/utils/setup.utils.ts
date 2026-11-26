import { createHash, randomBytes } from 'node:crypto'
import { SETUP_IDENTIFIER_PREFIX } from '../constants/setup.constants.ts'

const TOKEN_BYTES = 32
const FALLBACK_SLUG = 'workspace'

export function createSetupToken() {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function setupIdentifier(token: string) {
  return `${SETUP_IDENTIFIER_PREFIX}${createHash('sha256').update(token).digest('hex')}`
}

export function slugifyWorkspaceName(name: string) {
  const slug = name
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')

  return slug || FALLBACK_SLUG
}
