const runtimeOwnerPattern = /\/apps\/[^/]+\/app\//u
const appRuntimePattern = /\/apps\/[^/]+\/(?:app|server)\//u
const applicationRuntimePattern = /\/apps\/[^/]+\/(?:app|server)\//u
const entityOwnerPattern = /\/apps\/[^/]+\/app\/entities\//u
const testPattern = /(?:\.(?:test|spec)\.[^/]+|\/tests?\/)/u

export function normalizeFilename(filename: string) {
  return filename.replaceAll('\\', '/')
}

export function isRuntimeOwnerFile(filename: string) {
  return runtimeOwnerPattern.test(normalizeFilename(filename))
}

export function isAppRuntimeFile(filename: string) {
  return appRuntimePattern.test(normalizeFilename(filename))
}

export function isApplicationRuntimeFile(filename: string) {
  return applicationRuntimePattern.test(normalizeFilename(filename))
}

export function isEntityOwnerFile(filename: string) {
  return entityOwnerPattern.test(normalizeFilename(filename))
}

export function isTestFile(filename: string) {
  return testPattern.test(normalizeFilename(filename))
}
