import { SOURCE_LOCALE_TOKEN } from '@glot/database/constants/projects'
import { SOURCE_DEFAULT_FILE, SOURCE_LAYOUTS } from '../constants/sources.constants.ts'

export function sourceShape(pathPattern: string) {
  const at = pathPattern.indexOf(SOURCE_LOCALE_TOKEN)
  const folder = at < 0 ? pathPattern : pathPattern.slice(0, at).replace(/\/$/u, '')
  const rest = at < 0 ? '' : pathPattern.slice(at + SOURCE_LOCALE_TOKEN.length)
  const nested = rest.startsWith('/')

  return {
    folder,
    layout: nested ? SOURCE_LAYOUTS.FOLDER_PER_LANGUAGE : SOURCE_LAYOUTS.FILE_PER_LANGUAGE,
    fileName: nested ? rest.slice(1) : SOURCE_DEFAULT_FILE,
    segments: folder.split('/').filter(Boolean),
    suffix: nested ? `/${rest.slice(1)}` : rest,
  }
}

export function sourcePattern(shape: { folder: string; layout: string; fileName: string }) {
  const folder = shape.folder.trim().replace(/\/+$/u, '')
  const base = folder ? `${folder}/${SOURCE_LOCALE_TOKEN}` : SOURCE_LOCALE_TOKEN

  return shape.layout === SOURCE_LAYOUTS.FOLDER_PER_LANGUAGE
    ? `${base}/${shape.fileName.trim() || SOURCE_DEFAULT_FILE}`
    : `${base}.json`
}

export function sourceFiles(options: { pathPattern: string; languages: string[] }) {
  return options.languages.map((language) => ({
    language,
    path: options.pathPattern.replace(SOURCE_LOCALE_TOKEN, language),
  }))
}
