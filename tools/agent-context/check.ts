import { readdir, stat } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '../..')
const SKILLS_ROOT = resolve(ROOT, '.agents/skills')
const REPORT_PATH = 'docs/reports/agent-context-scenarios.md'

const ROUTING_EVAL_SKILLS = [
  'glot-code-patterns',
  'glot-api-contracts',
  'glot-skill-maintenance',
] as const

const REQUIRED_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  'CONTEXT.md',
  'README.md',
  'docs/README.md',
  'docs/architecture.md',
  'docs/adr/README.md',
  'docs/adr/0001-git-is-the-record.md',
  'docs/adr/0002-orpc-served-by-nuxt.md',
  'docs/adr/0003-postgresql-uuidv7-domain-identifiers.md',
  'docs/implementation/README.md',
  'docs/implementation/roadmap.md',
  'docs/implementation/decision-log.md',
  'docs/implementation/open-questions.md',
  'docs/implementation/slices/_template.md',
  'docs/implementation/slices/foundation.md',
  REPORT_PATH,
  '.agents/skills/glot-code-patterns/references/ownership-and-file-roles.md',
  '.agents/skills/glot-code-patterns/references/construction-and-reuse.md',
  '.agents/skills/glot-api-contracts/references/backend-baseline.md',
  ...ROUTING_EVAL_SKILLS.map((name) => `.agents/skills/${name}/SKILL.md`),
  ...ROUTING_EVAL_SKILLS.map((name) => `.agents/skills/${name}/evals.json`),
] as const

const SCENARIOS = [
  {
    id: 'domain-procedure',
    owner: '.agents/skills/glot-api-contracts/SKILL.md',
    anchors: ['implement(contract)', 'domain service', 'transaction'],
  },
  {
    id: 'persistence-derivation',
    owner: '.agents/skills/glot-api-contracts/SKILL.md',
    anchors: ['derive from the database validators', 'defineRelationsPart'],
  },
  {
    id: 'people-only',
    owner: '.agents/skills/glot-api-contracts/SKILL.md',
    anchors: ['PEOPLE_ONLY_PROCEDURES', 'Tokens never approve or release'],
  },
  {
    id: 'identifier-policy',
    owner: 'docs/adr/0003-postgresql-uuidv7-domain-identifiers.md',
    anchors: ['uuidv7()', 'opaque identifiers remain `text`'],
  },
  {
    id: 'git-record',
    owner: 'docs/adr/0001-git-is-the-record.md',
    anchors: ['Git is the record', 'semantic rebase'],
  },
  {
    id: 'meaningful-test',
    owner: '.agents/skills/glot-code-patterns/SKILL.md',
    anchors: ['Reject tests that restate types', 'observable behavior'],
  },
  {
    id: 'file-roles',
    owner: '.agents/skills/glot-code-patterns/references/ownership-and-file-roles.md',
    anchors: ['`texts.service.ts`', 'one role per file'],
  },
] as const

const errors: string[] = []
let checks = 0

async function exists(path: string) {
  try {
    await stat(resolve(ROOT, path))

    return true
  } catch {
    return false
  }
}

async function read(path: string) {
  return Bun.file(resolve(ROOT, path)).text()
}

function check({ condition, message }: { condition: boolean; message: string }) {
  checks += 1

  if (!condition) {
    errors.push(message)
  }
}

function parseFrontmatter({ content, path }: { content: string; path: string }) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/)

  check({ condition: Boolean(match), message: `${path}: missing YAML frontmatter` })

  if (!match) {
    return undefined
  }

  try {
    return Bun.YAML.parse(match[1]) as { description?: unknown; name?: unknown }
  } catch (error) {
    errors.push(`${path}: invalid YAML frontmatter (${String(error)})`)

    return undefined
  }
}

function lines(content: string) {
  return content.trimEnd().split('\n').length
}

function words(content: string) {
  return content.trim().split(/\s+/).filter(Boolean).length
}

type RoutingEvalSuite = {
  queries?: Array<{ id?: unknown; query?: unknown; should_trigger?: unknown }>
  runs_per_query?: unknown
  skill?: unknown
  trigger_threshold?: unknown
  version?: unknown
}

async function validateRequiredFiles() {
  for (const path of REQUIRED_FILES) {
    check({
      condition: await exists(path),
      message: `${path}: required knowledge surface is missing`,
    })
  }
}

async function validateBudgets() {
  const agents = await read('AGENTS.md')

  check({
    condition: lines(agents) <= 90,
    message: `AGENTS.md: ${lines(agents)} lines exceeds the 90-line budget`,
  })
  check({
    condition: words(agents) <= 1_100,
    message: `AGENTS.md: ${words(agents)} words exceeds the 1,100-word budget`,
  })
}

async function validateSkills() {
  const entries = await readdir(SKILLS_ROOT, { withFileTypes: true })
  const skillNames: string[] = []
  const skillContents = new Map<string, string>()

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const skillPath = `.agents/skills/${entry.name}/SKILL.md`

    if (!(await exists(skillPath))) {
      continue
    }

    const content = await read(skillPath)
    const frontmatter = parseFrontmatter({ content: content, path: skillPath })

    skillNames.push(entry.name)
    skillContents.set(entry.name, content)

    check({
      condition: frontmatter?.name === entry.name,
      message: `${skillPath}: frontmatter name must match its directory`,
    })
    check({
      condition:
        typeof frontmatter?.description === 'string' && frontmatter.description.length >= 40,
      message: `${skillPath}: description must carry useful trigger context`,
    })
    check({
      condition: lines(content) <= 160,
      message: `${skillPath}: ${lines(content)} lines exceeds the 160-line budget`,
    })
    check({
      condition: words(content) <= 1_500,
      message: `${skillPath}: ${words(content)} words exceeds the 1,500-word budget`,
    })
  }

  const agents = await read('AGENTS.md')

  for (const name of skillNames) {
    const routedElsewhere = [...skillContents.entries()].some(
      ([candidate, content]) => candidate !== name && content.includes(`\`${name}\``),
    )

    check({
      condition: agents.includes(`.agents/skills/${name}/SKILL.md`) || routedElsewhere,
      message: `.agents/skills/${name}/SKILL.md: skill has no routing pointer`,
    })
  }
}

async function markdownFiles(path: string): Promise<string[]> {
  const absolute = resolve(ROOT, path)
  const entry = await stat(absolute)

  if (entry.isFile()) {
    return path.endsWith('.md') ? [path] : []
  }

  const children = await readdir(absolute, { withFileTypes: true })
  const results: string[] = []

  for (const child of children) {
    const childPath = `${path}/${child.name}`

    if (child.isDirectory()) {
      results.push(...(await markdownFiles(childPath)))
    } else if (child.name.endsWith('.md')) {
      results.push(childPath)
    }
  }

  return results
}

async function validateLinks() {
  const paths = [
    'AGENTS.md',
    'README.md',
    'CONTEXT.md',
    ...(await markdownFiles('.agents/skills')),
    ...(await markdownFiles('docs')),
  ]

  for (const path of paths) {
    const content = await read(path)
    const links = content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)

    for (const match of links) {
      const target = match[1].split('#')[0]

      if (!target || /^(?:https?:|mailto:)/.test(target)) {
        continue
      }

      const targetPath = relative(ROOT, resolve(ROOT, dirname(path), target))
      check({
        condition: await exists(targetPath),
        message: `${path}: broken local link to ${target}`,
      })
    }
  }
}

async function validateRoutingEvals() {
  for (const name of ROUTING_EVAL_SKILLS) {
    const path = `.agents/skills/${name}/evals.json`
    let suite: RoutingEvalSuite

    try {
      suite = JSON.parse(await read(path)) as RoutingEvalSuite
    } catch (error) {
      errors.push(`${path}: invalid JSON (${String(error)})`)
      continue
    }

    const queries = Array.isArray(suite.queries) ? suite.queries : []
    const triggerQueries = queries.filter((query) => query.should_trigger === true)
    const nonTriggerQueries = queries.filter((query) => query.should_trigger === false)
    const ids = queries.map((query) => query.id)
    const prompts = queries.map((query) => query.query)

    check({ condition: suite.skill === name, message: `${path}: skill must match its directory` })
    check({ condition: suite.version === 1, message: `${path}: unsupported eval version` })
    check({
      condition: suite.runs_per_query === 3,
      message: `${path}: routing evidence requires three runs per query`,
    })
    check({
      condition: suite.trigger_threshold === 0.5,
      message: `${path}: trigger threshold must remain 0.5`,
    })
    check({
      condition: queries.length >= 12,
      message: `${path}: requires at least twelve routing queries`,
    })
    check({
      condition: triggerQueries.length >= 6,
      message: `${path}: requires at least six trigger queries`,
    })
    check({
      condition: nonTriggerQueries.length >= 6,
      message: `${path}: requires at least six non-trigger queries`,
    })
    check({
      condition: queries.every(
        (query) =>
          typeof query.id === 'string' &&
          typeof query.query === 'string' &&
          query.query.length >= 20 &&
          typeof query.should_trigger === 'boolean',
      ),
      message: `${path}: every query requires an id, a concrete prompt, and a boolean expectation`,
    })
    check({
      condition: new Set(ids).size === ids.length,
      message: `${path}: query ids must be unique`,
    })
    check({
      condition: new Set(prompts).size === prompts.length,
      message: `${path}: query prompts must be unique`,
    })
    check({
      condition: prompts.every((prompt) => typeof prompt !== 'string' || !prompt.includes(name)),
      message: `${path}: queries must test natural routing without naming the skill`,
    })
  }
}

async function validateScenarios() {
  const report = await read(REPORT_PATH)

  for (const scenario of SCENARIOS) {
    const owner = await read(scenario.owner)

    check({
      condition: report.includes(`\`${scenario.id}\``),
      message: `${REPORT_PATH}: missing ${scenario.id} result`,
    })

    for (const anchor of scenario.anchors) {
      check({
        condition: owner.includes(anchor),
        message: `${scenario.owner}: ${scenario.id} is missing “${anchor}”`,
      })
    }
  }
}

async function validateImplementationLedger() {
  const agents = await read('AGENTS.md')
  const ledger = await read('docs/implementation/README.md')
  const roadmap = await read('docs/implementation/roadmap.md')
  const decisions = await read('docs/implementation/decision-log.md')
  const questions = await read('docs/implementation/open-questions.md')
  const foundation = await read('docs/implementation/slices/foundation.md')
  const decisionIds = Array.from(decisions.matchAll(/^\|\s*(D-\d{3})\s*\|/gm), (match) => match[1])

  const duplicateDecisionIds = [
    ...new Set(decisionIds.filter((id, index) => decisionIds.indexOf(id) !== index)),
  ]

  const anchors = [
    {
      path: 'AGENTS.md',
      content: agents,
      required: ['implementation ledger', 'mark a slice complete only'],
    },
    {
      path: 'docs/implementation/README.md',
      content: ledger,
      required: [
        'Source and executable evidence outrank this ledger',
        'Update the slice record in the same change',
        'Do not mark a slice complete',
        'Promote a decision to an ADR',
      ],
    },
    {
      path: 'docs/implementation/roadmap.md',
      content: roadmap,
      required: ['Foundation', 'Release train', 'Deferred'],
    },
    {
      path: 'docs/implementation/decision-log.md',
      content: decisions,
      required: ['UUIDv7', 'better-drizzle', 'oRPC', 'No tautological tests'],
    },
    {
      path: 'docs/implementation/open-questions.md',
      content: questions,
      required: ['Do not answer these questions by inference', 'Review policy'],
    },
    {
      path: 'docs/implementation/slices/foundation.md',
      content: foundation,
      required: ['Status: Verified', 'end-to-end suite'],
    },
  ]

  for (const { path, content, required } of anchors) {
    for (const anchor of required) {
      check({ condition: content.includes(anchor), message: `${path}: missing “${anchor}”` })
    }
  }

  check({
    condition: duplicateDecisionIds.length === 0,
    message: `docs/implementation/decision-log.md: duplicate decision IDs ${duplicateDecisionIds.join(', ')}`,
  })
}

await validateRequiredFiles()

await validateBudgets()

await validateSkills()

await validateLinks()

await validateRoutingEvals()

await validateScenarios()

await validateImplementationLedger()

if (errors.length > 0) {
  console.error(`Agent context failed ${errors.length} of ${checks} checks:\n`)
  console.error(errors.map((error) => `- ${error}`).join('\n'))
  process.exit(1)
}

process.stdout.write(
  `Agent context passed ${checks} deterministic checks across ${SCENARIOS.length} scenarios.\n`,
)
