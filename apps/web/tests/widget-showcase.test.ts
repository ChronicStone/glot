import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { GLOSSARY_TERM_STATUSES } from '@glot/database/constants/glossary'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { createDatabase } from '@glot/database/server'
import { createGlotClient } from '@glot/sdk'
import { seedDemoProject } from '@glot/seed'
import { seedDemoRepository } from '@glot/seed/repository'
import { chromium } from 'playwright-core'
import type { Browser, BrowserContext, Page } from 'playwright-core'
import { afterAll, beforeAll, expect, inject, test } from 'vite-plus/test'
import { signInByMagicLink, withCookie } from './support/session.ts'

const baseUrl = inject('baseUrl')
const demoUrl = inject('playgroundUrl')
const REPOSITORY = 'glot/showcase'
const LOT_PAGE = `${demoUrl}/pl/lots/48213`
const KEY = 'marketplace.bid.nextMinimum'
const FIXED = 'Następna minimalna oferta: {amount}'
const POLL = { timeout: 15_000 }
const RECORDING = '/tmp/ui-shots/glot-widget/showcase.webm'

const PEOPLE = [
  { name: 'Wanda', role: WORKSPACE_ROLES.WRITER, languages: ['pl'] },
  { name: 'Rita', role: WORKSPACE_ROLES.REVIEWER, languages: ['pl'] },
  { name: 'Olivia', role: WORKSPACE_ROLES.OWNER, languages: [] },
]

const cookies = new Map<string, string>()
const scratch = await mkdtemp(join(tmpdir(), 'glot-showcase-'))
let projectId = ''
let demo: ChildProcess | null = null
let browser: Browser | null = null

function glot(name: string) {
  const cookie = cookies.get(name)

  if (!cookie) throw new Error(`${name} is not signed in`)

  return createGlotClient({ url: baseUrl, fetch: withCookie(cookie) })
}

async function signedInContext(options: { name: string; video?: string | undefined }) {
  if (!browser) throw new Error('The browser did not start')

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...(options.video
      ? { recordVideo: { dir: options.video, size: { width: 1440, height: 900 } } }
      : {}),
  })

  const pairs = (cookies.get(options.name) ?? '').split('; ').filter(Boolean)

  await context.addCookies(
    pairs.map((pair) => {
      const [name = '', ...rest] = pair.split('=')

      return { name, value: rest.join('='), url: baseUrl }
    }),
  )

  return context
}

function shadow(page: Page, selector: string) {
  return page.locator(`glot-widget ${selector}`)
}

async function heights(page: Page, selector: string) {
  return shadow(page, selector).evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().height)),
  )
}

async function signWidgetIn(options: { page: Page; context: BrowserContext }) {
  const [popup] = await Promise.all([
    options.context.waitForEvent('page'),
    shadow(options.page, '[data-glot=launcher]').click(),
  ])

  return popup
}

async function waitForDemo() {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const ready = await fetch(`${demoUrl}/api/locales/pl`)
      .then((response) => response.ok)
      .catch(() => false)

    if (ready) return
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error('The demo app did not start')
}

beforeAll(async () => {
  const connection = createDatabase({ connectionString: inject('databaseUrl') })

  const workspace = await connection.db.workspaces.create({
    data: { name: 'Showcase', slug: 'showcase' },
  })

  const elsewhere = await connection.db.workspaces.create({
    data: { name: 'Elsewhere showcase', slug: 'elsewhere-showcase' },
  })

  for (const person of PEOPLE) {
    await connection.db.user.create({
      data: {
        id: `user-${person.name.toLowerCase()}-showcase`,
        name: person.name,
        email: `${person.name.toLowerCase()}@showcase.test`,
        emailVerified: true,
      },
    })

    await connection.db.workspaceMemberships.create({
      data: {
        workspaceId: workspace.id,
        userId: `user-${person.name.toLowerCase()}-showcase`,
        role: person.role,
        languages: person.languages,
      },
    })
  }

  await connection.db.user.create({
    data: {
      id: 'user-nora-showcase',
      name: 'Nora',
      email: 'nora@showcase.test',
      emailVerified: true,
    },
  })

  await connection.db.workspaceMemberships.create({
    data: { workspaceId: elsewhere.id, userId: 'user-nora-showcase', role: WORKSPACE_ROLES.OWNER },
  })

  const lot = await connection.db.glossaryConcepts.create({
    data: {
      workspaceId: workspace.id,
      name: 'lot',
      definition: 'An item sold at auction, never a plot of land.',
      status: GLOSSARY_TERM_STATUSES.VALIDATED,
      neverTranslate: false,
      notes: '',
    },
  })

  await connection.db.glossaryConceptTerms.createMany({
    data: [
      { conceptId: lot.id, language: 'fr', term: 'lot', plural: 'lots', avoid: [] },
      { conceptId: lot.id, language: 'pl', term: 'partia', plural: 'partie', avoid: ['działka'] },
    ],
  })

  const project = await seedDemoProject(connection.db, {
    workspaceId: workspace.id,
    repository: REPOSITORY,
  })

  await connection.close()
  projectId = project.id

  const { directory } = await seedDemoRepository({
    root: inject('repositoriesRoot'),
    repository: REPOSITORY,
    withApp: true,
  })

  for (const name of [...PEOPLE.map((person) => person.name), 'Nora']) {
    cookies.set(name, await signInByMagicLink(`${name.toLowerCase()}@showcase.test`))
  }

  demo = spawn('bunx', ['nuxt', 'dev', '--port', new URL(demoUrl).port], {
    cwd: new URL('../../demo', import.meta.url).pathname,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([name]) => !/^(?:VITEST|TEST$|NODE_ENV$)/u.test(name)),
      ),
      NUXT_IGNORE_LOCK: '1',
      DEMO_BUILD_DIR: join(scratch, 'nuxt'),
      GLOT_URL: baseUrl,
      GLOT_PROJECT: REPOSITORY,
      GLOT_LOCALES_DIR: directory,
    },
    stdio: 'ignore',
    detached: true,
  })

  await waitForDemo()
  browser = await chromium.launch({ channel: 'chrome', headless: true })
}, 240_000)

afterAll(async () => {
  await browser?.close()

  if (demo?.pid) process.kill(-demo.pid, 'SIGTERM')

  await rm(scratch, { recursive: true, force: true })
})

test('a visitor and someone outside the project never get the widget', async () => {
  const context = await signedInContext({ name: 'Nora' })
  const page = await context.newPage()

  await page.goto(LOT_PAGE)
  await expect
    .poll(() => page.locator('main').textContent(), POLL)
    .toContain('Następna minimalna działka')
  expect(await page.locator('glot-widget').count()).toBe(0)

  await page.goto(`${LOT_PAGE}?glot`)
  const popup = await signWidgetIn({ page, context })

  await expect.poll(() => popup.textContent('body'), POLL).toContain('No access')
  await expect
    .poll(() => shadow(page, '[data-glot=launcher]').textContent(), POLL)
    .toContain('No access')
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('glot:'))),
  ).toEqual([])

  await context.close()
}, 60_000)

test('a host Nuxt UI modal stays open and keeps its hands off while a member works in the widget', async () => {
  const context = await signedInContext({ name: 'Wanda' })
  const page = await context.newPage()

  const dialog = page
    .locator('[role=dialog][data-state=open]')
    .filter({ hasText: 'Poproś o oględziny' })

  await page.goto(`${LOT_PAGE}?glot`)
  const popup = await signWidgetIn({ page, context })

  await popup.waitForEvent('close', { timeout: 20_000 })
  await expect
    .poll(() => shadow(page, '[data-glot=launcher]').textContent(), POLL)
    .toContain('to check')

  await page.locator('main .bid .secondary').click()
  await expect.poll(() => dialog.isVisible(), POLL).toBe(true)

  await shadow(page, '[data-glot=launcher]').click()
  await expect.poll(() => shadow(page, '[data-glot=drawer]').isVisible(), POLL).toBe(true)
  expect(await dialog.isVisible()).toBe(true)

  await shadow(page, `[data-glot=row][data-key="${KEY}"] .t`).click()
  const message = shadow(page, '[data-glot=message]')
  await page.waitForTimeout(1500)

  await expect.poll(() => message.isVisible(), POLL).toBe(true)
  await message.click()
  await message.press('End')
  await message.pressSequentially(' x', { delay: 30 })
  await page.waitForTimeout(400)

  expect(await dialog.isVisible()).toBe(true)
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('GLOT-WIDGET')
  expect(await message.textContent()).toContain(' x')

  if (process.env.GLOT_RECORD) {
    await page.screenshot({ path: '/tmp/ui-shots/glot-widget/08-host-modal.png' })
  }

  await message.press('Escape')
  await expect.poll(() => shadow(page, '[data-glot=editor]').count(), POLL).toBe(0)
  expect(await dialog.isVisible()).toBe(true)

  await dialog.locator('button[type=submit]').click()
  await expect.poll(() => shadow(page, '[data-glot=editor]').count(), POLL).toBe(1)
  expect(await dialog.isVisible()).toBe(true)

  await context.close()
}, 90_000)

async function dragBy(options: { page: Page; selector: string; dx: number; dy: number }) {
  const box = await shadow(options.page, options.selector).boundingBox()

  if (!box) throw new Error(`${options.selector} is not on screen`)

  const from = { x: box.x + Math.min(24, box.width / 2), y: box.y + box.height / 2 }

  await options.page.mouse.move(from.x, from.y)
  await options.page.mouse.down()

  for (let step = 1; step <= 10; step += 1) {
    await options.page.mouse.move(
      from.x + (options.dx * step) / 10,
      from.y + (options.dy * step) / 10,
    )
  }

  await options.page.mouse.up()
}

async function shoot(options: { page: Page; name: string }) {
  if (process.env.GLOT_RECORD) {
    await options.page.screenshot({ path: `/tmp/ui-shots/glot-move/${options.name}.png` })
  }
}

test('the pill drags anywhere, a click still opens it, and it stays where it was put', async () => {
  const context = await signedInContext({ name: 'Wanda' })
  const page = await context.newPage()
  const launcher = shadow(page, '[data-glot=launcher]')

  await page.goto(`${LOT_PAGE}?glot`)
  const popup = await signWidgetIn({ page, context })

  await popup.waitForEvent('close', { timeout: 20_000 })
  await expect.poll(() => launcher.textContent(), POLL).toContain('to check')

  const before = await launcher.boundingBox()

  await dragBy({ page, selector: '[data-glot=launcher]', dx: 500, dy: -600 })
  const after = await launcher.boundingBox()

  expect(Math.round((after?.x ?? 0) - (before?.x ?? 0))).toBe(500)
  expect(Math.round((after?.y ?? 0) - (before?.y ?? 0))).toBe(-600)
  expect(await shadow(page, '[data-glot=drawer]').count()).toBe(0)
  await shoot({ page, name: '02-pill-dragged' })

  await page.reload()
  await expect.poll(async () => (await launcher.boundingBox())?.x, POLL).toBe(after?.x)

  await page.setViewportSize({ width: 600, height: 400 })
  await expect
    .poll(async () => {
      const box = await launcher.boundingBox()

      return !!box && box.x + box.width <= 600 && box.y + box.height <= 400
    }, POLL)
    .toBe(true)

  await launcher.click()
  await expect.poll(() => shadow(page, '[data-glot=drawer]').count(), POLL).toBe(1)

  await context.close()
}, 90_000)

test('the panel docks left or right by its header or its dock button, and steps aside from the text being edited', async () => {
  const context = await signedInContext({ name: 'Wanda' })
  const page = await context.newPage()
  const drawer = shadow(page, '[data-glot=drawer]')
  const dock = shadow(page, '[data-glot=dock]')

  await page.goto(`${LOT_PAGE}?glot`)
  const popup = await signWidgetIn({ page, context })

  await popup.waitForEvent('close', { timeout: 20_000 })
  await shadow(page, '[data-glot=launcher]').click()
  await expect.poll(() => drawer.getAttribute('data-side'), POLL).toBe('right')
  await shoot({ page, name: '03-docked-right' })
  expect(await shadow(page, '.w-foot').textContent()).toContain(`Wanda · ${new URL(demoUrl).host}`)

  await dragBy({ page, selector: '.w-head b', dx: -1000, dy: 20 })
  await expect.poll(() => drawer.getAttribute('data-side'), POLL).toBe('left')
  expect((await drawer.boundingBox())?.x).toBe(12)
  await shoot({ page, name: '04-docked-left' })

  await page.reload()
  await shadow(page, '[data-glot=launcher]').click()
  await expect.poll(() => drawer.getAttribute('data-side'), POLL).toBe('left')
  expect(await dock.getAttribute('aria-label')).toBe('Dock to the right')

  await dock.focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => drawer.getAttribute('data-side'), POLL).toBe('right')

  await page.setViewportSize({ width: 1100, height: 900 })
  await shoot({ page, name: '05-text-under-panel' })
  await shadow(page, `[data-glot=row][data-key="${KEY}"] .t`).click()
  await expect.poll(() => drawer.getAttribute('data-side'), POLL).toBe('left')

  const panel = await drawer.boundingBox()
  const text = await page.locator('main .bid > div').first().boundingBox()

  expect((panel?.x ?? 0) + (panel?.width ?? 0)).toBeLessThan(text?.x ?? 0)
  await shoot({ page, name: '06-stepped-aside' })

  await shadow(page, '[data-glot=editor] [aria-label=Close]').click()
  await expect.poll(() => drawer.getAttribute('data-side'), POLL).toBe('right')

  await page.setViewportSize({ width: 375, height: 812 })
  await expect.poll(() => drawer.getAttribute('data-side'), POLL).toBe(null)
  expect(await dock.count()).toBe(0)
  expect((await drawer.boundingBox())?.width).toBe(375)
  await shoot({ page, name: '07-phone-sheet' })

  await context.close()
}, 90_000)

test('a member fixes a Polish text in the page, sends it for review, and after the release the app shows it', async () => {
  const video = process.env.GLOT_RECORD ? join(scratch, 'video') : undefined
  const context = await signedInContext({ name: 'Wanda', video })
  const page = await context.newPage()

  await page.goto(`${LOT_PAGE}?glot`)
  await expect
    .poll(() => shadow(page, '[data-glot=launcher]').textContent(), POLL)
    .toContain('Sign in')

  const popup = await signWidgetIn({ page, context })

  await popup.waitForEvent('close', { timeout: 20_000 })
  await expect
    .poll(() => shadow(page, '[data-glot=launcher]').textContent(), POLL)
    .toContain('1 to fix')

  await shadow(page, '[data-glot=launcher]').click()
  const row = shadow(page, `[data-glot=row][data-key="${KEY}"]`)

  await expect.poll(() => row.textContent(), POLL).toContain(KEY)
  await page.waitForTimeout(600)

  const head = await heights(page, '.w-head .right > *')
  const strip = await heights(page, '.w-sub .seg')

  expect(new Set(head).size).toBe(1)
  expect(strip[0]).toBe(head[0])

  await page.locator('main .bid > div').first().click()
  const editor = shadow(page, '[data-glot=editor]')

  await expect
    .poll(() => editor.locator('[data-glot=key]').getAttribute('data-key'), POLL)
    .toBe(KEY)
  await page.waitForTimeout(600)

  await expect
    .poll(() => shadow(page, '[data-glot=fits]').textContent(), POLL)
    .toMatch(/Fits the line: \d+ of \d+ px/u)

  const message = shadow(page, '[data-glot=message]')

  await message.press('ControlOrMeta+a')
  await message.pressSequentially(FIXED, { delay: 25 })
  await expect
    .poll(() => page.locator('main .bid > div').first().textContent(), POLL)
    .toContain('Następna minimalna oferta:')

  const footer = await heights(page, '[data-glot=editor] .row-flex .btn')

  expect(new Set(footer).size).toBe(1)

  await editor.getByRole('button', { name: 'Send for review' }).click()
  await expect
    .poll(() => shadow(page, '[data-glot=editor-status]').textContent(), POLL)
    .toBe('Sent for review')
  await page.waitForTimeout(800)

  const text = (await glot('Rita').texts.byKeys({ projectId, keys: [KEY] })).items[0]
  const polish = text?.translations.find((entry) => entry.language === 'pl')

  expect(polish?.draft).toMatchObject({ value: FIXED, status: DRAFT_STATUSES.IN_REVIEW })

  const review = await context.newPage()

  await review.goto(`${baseUrl}/projects/${projectId}/texts`)
  await review.locator(`[data-id="${text?.id ?? ''}"]`).click()
  await expect
    .poll(
      () =>
        review.evaluate(() =>
          [
            document.body.innerText,
            ...[...document.querySelectorAll('input, textarea')].map((field) =>
              field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
                ? field.value
                : '',
            ),
          ].join('\n'),
        ),
      POLL,
    )
    .toContain('Następna minimalna oferta:')
  await review.waitForTimeout(1200)
  await review.close()

  await glot('Rita').reviews.approve({
    projectId,
    textId: text?.id ?? '',
    language: 'pl',
    draftId: polish?.draft?.id ?? '',
  })
  await glot('Olivia').releases.run({ projectId })

  const visitor = await browser?.newPage()

  await visitor?.goto(LOT_PAGE)
  await expect
    .poll(() => visitor?.locator('main .bid > div').first().textContent(), POLL)
    .toContain('Następna minimalna oferta:')
  await visitor?.close()

  await page.reload()
  await expect
    .poll(() => page.locator('main .bid > div').first().textContent(), POLL)
    .toContain('Następna minimalna oferta:')
  await page.waitForTimeout(1200)

  const recording = page.video()

  await context.close()

  if (recording) {
    await mkdir('/tmp/ui-shots/glot-widget', { recursive: true })
    await copyFile(await recording.path(), RECORDING)
  }
}, 120_000)
