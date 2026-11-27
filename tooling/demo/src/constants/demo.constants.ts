export const DEMO_DATABASE = 'glot_demo'

export const DEMO_POSTGRES_URL = 'postgres://glot:glot@localhost:54329'

export const DEMO_PORTS = {
  GLOT: 3100,
  APP: 3200,
  PREVIEW: 3300,
} as const

export const DEMO_REPOSITORIES_FOLDER = '.data/demo-repositories'

export const DEMO_PEOPLE = {
  OWNER: 'marie@glot.test',
  REVIEWER: 'anna@glot.test',
} as const

export const DEMO_SIGN_IN_PATTERN = /Sign-in link for (\S+): (\S+)/u
