import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'
import { AI_ENCRYPTION } from '../constants/ai.constants.ts'

export function deriveAiKey(secret: string) {
  return Buffer.from(
    hkdfSync('sha256', secret, AI_ENCRYPTION.SALT, AI_ENCRYPTION.INFO, AI_ENCRYPTION.KEY_BYTES),
  )
}

export function encryptSecret(options: { key: Buffer; value: string }) {
  const iv = randomBytes(AI_ENCRYPTION.IV_BYTES)
  const cipher = createCipheriv(AI_ENCRYPTION.ALGORITHM, options.key, iv)
  const encrypted = Buffer.concat([cipher.update(options.value, 'utf8'), cipher.final()])

  return [AI_ENCRYPTION.VERSION, iv, cipher.getAuthTag(), encrypted]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64')))
    .join('.')
}

export function decryptSecret(options: { key: Buffer; ciphertext: string }) {
  const [version, iv, tag, encrypted] = options.ciphertext.split('.')

  if (version !== AI_ENCRYPTION.VERSION || !iv || !tag || !encrypted) {
    return null
  }

  try {
    const decipher = createDecipheriv(
      AI_ENCRYPTION.ALGORITHM,
      options.key,
      Buffer.from(iv, 'base64'),
    )

    decipher.setAuthTag(Buffer.from(tag, 'base64'))

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}
