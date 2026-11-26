import { AVATAR_COLORS } from '../constants/people.constants.ts'

export function initialsOf(name: string) {
  return name
    .split(/\s+/u)
    .map((word) => word[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function avatarColor(name: string) {
  const colors = Object.values(AVATAR_COLORS)

  const sum = Array.from(name, (letter) => letter.codePointAt(0) ?? 0).reduce(
    (total, code) => total + code,
    0,
  )

  return colors[sum % colors.length]
}
