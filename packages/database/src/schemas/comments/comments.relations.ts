import { defineRelationsPart } from 'drizzle-orm'
import * as schema from '../index.ts'

export const commentsRelationsPart = defineRelationsPart(schema, (r) => ({
  comments: {
    project: r.one.projects({ from: r.comments.projectId, to: r.projects.id, optional: false }),
    author: r.one.user({ from: r.comments.authorId, to: r.user.id, optional: false }),
  },
}))
