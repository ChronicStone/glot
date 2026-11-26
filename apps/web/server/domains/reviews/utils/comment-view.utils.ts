import type { Comment } from '@glot/database'

export function commentView(options: { comment: Comment; authorName: string }) {
  const { comment } = options

  return {
    id: comment.id,
    language: comment.language,
    kind: comment.kind,
    body: comment.body,
    authorId: comment.authorId,
    authorName: options.authorName,
    createdAt: comment.createdAt,
  }
}
