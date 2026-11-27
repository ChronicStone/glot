import { mkdir } from 'node:fs/promises'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { createDatabase } from '@glot/database/server'
import { createGlotClient } from '@glot/sdk'
import { seedDemoProject } from '@glot/seed'
import { seedDemoRepository } from '@glot/seed/repository'
import { chromium } from 'playwright-core'
import type { Browser, Page } from 'playwright-core'
import { afterAll, beforeAll, expect, inject, test } from 'vite-plus/test'
import { signInByMagicLink, withCookie } from './support/session.ts'

const baseUrl = inject('baseUrl')
const SHOTS = '/tmp/ui-shots/glot-glossary'
const REPOSITORY = 'glot/glossary-screen'
const POLL = { timeout: 30_000 }

const PEOPLE = [
  { id: 'screen-olga', name: 'Olga', role: WORKSPACE_ROLES.OWNER, languages: null },
  { id: 'screen-rita', name: 'Rita', role: WORKSPACE_ROLES.REVIEWER, languages: ['pl'] },
  { id: 'screen-gina', name: 'Gina', role: WORKSPACE_ROLES.WRITER, languages: ['pl'] },
]

const cookies = new Map<string, string>()
let browser: Browser | null = null
let conceptId = ''
let workspaceId = ''

function glot(name: string) {
  return createGlotClient({ url: baseUrl, fetch: withCookie(cookies.get(name) ?? '') })
}

async function glossaryAs(name: string) {
  if (!browser) throw new Error('The browser did not start')

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

  await context.addCookies(
    (cookies.get(name) ?? '')
      .split('; ')
      .filter(Boolean)
      .map((pair) => {
        const [cookie = '', ...rest] = pair.split('=')

        return { name: cookie, value: rest.join('='), url: baseUrl }
      }),
  )

  const page = await context.newPage()

  await page.goto(`${baseUrl}/glossary`)
  await page.getByText('przedmiot').first().waitFor(POLL)

  return page
}

async function openLot(page: Page) {
  await page.getByText('przedmiot').first().click()
}

beforeAll(async () => {
  const connection = createDatabase({ connectionString: inject('databaseUrl') })

  const workspace = await connection.db.workspaces.create({
    data: { name: 'Glossary screen', slug: 'glossary-screen' },
  })

  for (const person of PEOPLE) {
    await connection.db.user.create({
      data: {
        id: person.id,
        name: person.name,
        email: `${person.name.toLowerCase()}@glossary-screen.test`,
        emailVerified: true,
      },
    })

    await connection.db.workspaceMemberships.create({
      data: {
        workspaceId: workspace.id,
        userId: person.id,
        role: person.role,
        languages: person.languages,
      },
    })
  }

  await seedDemoProject(connection.db, { workspaceId: workspace.id, repository: REPOSITORY })
  await connection.close()
  await seedDemoRepository({ root: inject('repositoriesRoot'), repository: REPOSITORY })

  for (const person of PEOPLE) {
    cookies.set(
      person.name,
      await signInByMagicLink(`${person.name.toLowerCase()}@glossary-screen.test`),
    )
  }

  const concept = await glot('Olga').glossary.createConcept({
    workspaceId: workspace.id,
    name: 'lot',
    terms: {
      pl: { term: 'przedmiot', plural: null, avoid: [] },
      de: { term: 'Los', plural: null, avoid: [] },
    },
  })

  conceptId = concept.id
  workspaceId = workspace.id
  await mkdir(SHOTS, { recursive: true })
  browser = await chromium.launch({ channel: 'chrome', headless: true })
}, 240_000)

afterAll(async () => {
  await browser?.close()
})

test('a Polish reviewer suggests concepts and changes the Polish term, the other languages stay locked', async () => {
  const page = await glossaryAs('Rita')

  await expect(page.getByRole('button', { name: 'New concept' }).first().isVisible()).resolves.toBe(
    true,
  )

  await openLot(page)
  await expect(page.getByRole('button', { name: 'Remove the concept' }).count()).resolves.toBe(0)
  await page.getByRole('button', { name: 'Edit' }).click()

  const polish = page.getByRole('textbox', { name: 'Polish word', exact: true })

  await polish.waitFor(POLL)
  await expect(polish.isEditable()).resolves.toBe(true)
  await expect(
    page.getByRole('textbox', { name: 'German word', exact: true }).isEditable(),
  ).resolves.toBe(false)
  await expect(
    page.getByRole('textbox', { name: 'Concept', exact: true }).isEditable(),
  ).resolves.toBe(false)
  await expect(page.getByText('You change Polish only.').isVisible()).resolves.toBe(true)

  await polish.fill('przedmiot aukcji')
  await page
    .getByRole('dialog')
    .evaluate((dialog) =>
      Promise.all(dialog.getAnimations({ subtree: true }).map(({ finished }) => finished)),
    )
  await page.screenshot({ path: `${SHOTS}/01-reviewer-editor.png` })
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByText('Concept saved').first().waitFor(POLL)
  await page.screenshot({ path: `${SHOTS}/02-reviewer-saved.png` })

  const saved = (await glot('Olga').glossary.listConcepts({ workspaceId })).find(
    ({ id }) => id === conceptId,
  )

  expect(saved?.terms).toEqual({
    pl: { term: 'przedmiot aukcji', plural: null, avoid: [] },
    de: { term: 'Los', plural: null, avoid: [] },
  })
}, 120_000)

test('a writer reads the glossary without the buttons that change it', async () => {
  const page = await glossaryAs('Gina')

  await openLot(page)
  await page.screenshot({ path: `${SHOTS}/03-writer-reads.png` })
  await expect(page.getByRole('button', { name: 'New concept' }).count()).resolves.toBe(0)
  await expect(page.getByRole('button', { name: 'Edit' }).count()).resolves.toBe(0)
}, 120_000)
