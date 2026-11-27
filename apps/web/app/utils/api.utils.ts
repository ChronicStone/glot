export function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined
}
