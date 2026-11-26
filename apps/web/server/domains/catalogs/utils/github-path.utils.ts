export function encodePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/')
}
