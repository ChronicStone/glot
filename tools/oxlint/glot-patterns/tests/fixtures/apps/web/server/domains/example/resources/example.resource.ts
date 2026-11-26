const resourceSchema = { records: [] }

export function createExampleResource<T>(schema: T) {
  return { schema, resourceSchema }
}

export const createExampleQuery = <T>(input: T) => input
