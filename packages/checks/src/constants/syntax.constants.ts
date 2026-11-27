export const SYNTAXES = {
  VUE_I18N: 'vue-i18n',
  HANDLEBARS_HTML: 'handlebars-html',
} as const

export const TEMPLATE_LINK_PROTOCOLS = {
  HTTPS: 'https:',
  MAILTO: 'mailto:',
} as const

export const TEMPLATE_UNMATCHED_PROBLEM =
  'A {{, }}, [[ or ]] is left on its own: placeholders are written {{name}}.'

export const MESSAGE_NODE_TYPES = {
  TEXT: 3,
  NAMED: 4,
  LIST: 5,
  LINKED: 6,
  LITERAL: 9,
} as const

export const SYNTAX_PROBLEMS: Record<number, string> = {
  1: 'A brace or quote is missing or misplaced.',
  2: 'A placeholder holds something that is not a name or a number.',
  3: 'A quote opened inside a placeholder is never closed.',
  4: 'A backslash is followed by a character that cannot be escaped.',
  5: 'A unicode escape is incomplete.',
  6: 'A closing brace has no opening brace.',
  7: 'A placeholder is opened but never closed.',
  8: 'A placeholder is empty.',
  9: 'A placeholder cannot sit inside another placeholder.',
  10: "An at sign starts a link to another text. To show an at sign, write {'@'}.",
  11: 'A plural form is empty.',
  12: 'A link has a modifier but no text to link to.',
  13: "An at sign starts a link to another text but names none. To show an at sign, write {'@'}.",
  14: 'The message contains something that cannot be read.',
}

export const UNKNOWN_SYNTAX_PROBLEM = 'The message cannot be read.'
