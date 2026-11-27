/// <reference lib="esnext.iterator" />

import { writeFile } from 'node:fs/promises'

import { chromium } from 'playwright-core'
import type { BrowserContext, Page } from 'playwright-core'

import { RELEASE_FIXTURES } from './fixtures.ts'

const BASE_URL = process.env.GLOT_URL ?? 'http://localhost:3000'
const COOKIE = process.env.GLOT_COOKIE ?? ''
const REPORT_PATH = process.env.GLOT_CHECK_REPORT
const SETTLE_MS = Number(process.env.GLOT_CHECK_SETTLE_MS ?? 2500)
const TOLERANCE_PX = 0.5
const ROW_CENTER_PX = 2
const ROW_GAP_PX = 24

const CONTROL_SELECTOR = [
  'button',
  'a.btn',
  '[role="button"]',
  '[role="tab"]',
  '[role="switch"]',
  '[role="combobox"]',
  '.input',
  '.sel',
  '.seg',
  '.chip',
  '.set-tabs a',
  'input:not([type="hidden"])',
  'select',
  'textarea',
].join(', ')

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 375, height: 812 },
} as const

const SCREENS = [
  { name: 'Home', path: '/' },
  { name: 'Command palette', path: '/', press: 'Meta+k' },
  { name: 'Glossary', path: '/glossary' },
  { name: 'Glossary · concept editor', path: '/glossary', click: 'New concept' },
  { name: 'Texts', path: '/projects/{project}/texts' },
  { name: 'Texts · language filter', path: '/projects/{project}/texts', click: 'All languages' },
  { name: 'Review', path: '/projects/{project}/review' },
  { name: 'Releases', path: '/projects/{project}/releases' },
  {
    name: 'Releases · held back',
    path: '/projects/{project}/releases',
    fixtures: 'heldBack',
  },
  {
    name: 'Releases · undo',
    path: '/projects/{project}/releases',
    fixtures: 'undo',
    row: '3 texts',
  },
  { name: 'Emails & documents', path: '/projects/{project}/emails' },
  { name: 'People', path: '/settings/people' },
  { name: 'People · invite', path: '/settings/people', click: 'Invite' },
  { name: 'Projects', path: '/settings/projects' },
  { name: 'Projects · editor', path: '/settings/projects', click: 'New project' },
  { name: 'API keys', path: '/settings/keys' },
  { name: 'API keys · new key', path: '/settings/keys', click: 'Create a key' },
  { name: 'Sign in', path: '/sign-in', signedOut: true },
] as const

type Screen = (typeof SCREENS)[number]

type Control = {
  label: string
  height: number
  top: number
  bottom: number
  left: number
  right: number
}

type Row = { controls: { label: string; height: number }[]; spread: number }

type Result = {
  screen: string
  viewport: string
  rows: number
  mismatched: Row[]
  error?: string
  absent?: boolean
}

function cookies() {
  return COOKIE.split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const at = part.indexOf('=')

      return { name: part.slice(0, at), value: part.slice(at + 1), url: BASE_URL }
    })
}

function measure(selector: string) {
  function visible(element: Element) {
    const box = element.getBoundingClientRect()
    const style = getComputedStyle(element)

    return (
      box.width > 4 && box.height > 4 && style.visibility !== 'hidden' && style.display !== 'none'
    )
  }

  function labelOf(element: Element) {
    const text = (element.getAttribute('aria-label') ?? element.textContent ?? '')
      .trim()
      .replaceAll(/\s+/g, ' ')

    const kind = element.classList[0] ?? element.tagName.toLowerCase()

    return `${kind}${text ? ` “${text.slice(0, 24)}”` : ''}`
  }

  return document
    .querySelectorAll(selector)
    .values()
    .filter((element) => !element.parentElement?.closest(selector) && visible(element))
    .map((element) => {
      const box = element.getBoundingClientRect()

      return {
        label: labelOf(element),
        height: Math.round(box.height * 100) / 100,
        top: box.top,
        bottom: box.bottom,
        left: box.left,
        right: box.right,
      }
    })
    .toArray()
}

function adjacent(first: Control, second: Control) {
  const centers = Math.abs((first.top + first.bottom) / 2 - (second.top + second.bottom) / 2)
  const gap = Math.max(first.left, second.left) - Math.min(first.right, second.right)

  return centers <= ROW_CENTER_PX && gap >= -1 && gap <= ROW_GAP_PX
}

function rowsOf(controls: Control[]) {
  const parent = controls.map((_, index) => index)

  function root(index: number): number {
    const up = parent[index] ?? index

    return up === index ? index : root(up)
  }

  controls.forEach((first, index) =>
    controls.slice(index + 1).forEach((second, offset) => {
      if (adjacent(first, second)) {
        parent[root(index + offset + 1)] = root(index)
      }
    }),
  )

  const groups = Map.groupBy(
    controls.map((control, index) => ({ control, group: root(index) })),
    ({ group }) => group,
  )

  return [...groups.values()].flatMap((members) => {
    if (members.length < 2) {
      return []
    }

    const heights = members.map(({ control }) => control.height)

    return {
      controls: members
        .toSorted((first, second) => first.control.left - second.control.left)
        .map(({ control }) => ({ label: control.label, height: control.height })),
      spread: Math.max(...heights) - Math.min(...heights),
    }
  })
}

async function projectId(page: Page) {
  await page.goto(`${BASE_URL}/`)
  await page.waitForSelector('a[href^="/projects/"]', { timeout: 15_000 })

  const href = await page.getAttribute('a[href^="/projects/"]', 'href')

  return href?.split('/')[2] ?? ''
}

async function serve(page: Page, fixtures: keyof typeof RELEASE_FIXTURES) {
  for (const [procedure, fixture] of Object.entries(RELEASE_FIXTURES[fixtures])) {
    const dates = 'dates' in fixture ? fixture.dates : []

    await page.route(`**/rpc/${procedure}`, (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ json: fixture.json, meta: dates.map((path) => ['date', ...path]) }),
      }),
    )
  }
}

async function visit(options: { page: Page; screen: Screen; path: string }) {
  if (!('fixtures' in options.screen)) {
    await options.page.goto(`${BASE_URL}${options.path}`)

    return
  }

  await serve(options.page, options.screen.fixtures)
  await options.page.goto(`${BASE_URL}/`)
  await options.page.waitForSelector('#__nuxt')
  await options.page.evaluate(async (path) => {
    const app = Reflect.get(Object(document.querySelector('#__nuxt')), '__vue_app__')
    const properties = Reflect.get(Object(Reflect.get(Object(app), 'config')), 'globalProperties')
    const router = Object(Reflect.get(Object(properties), '$router'))

    await Reflect.apply(Reflect.get(router, 'push'), router, [path])
  }, options.path)
}

async function open(page: Page, screen: Screen) {
  if ('row' in screen) {
    await page.locator('[role="button"]', { hasText: screen.row }).first().click()
  }

  if ('click' in screen) {
    const trigger = page.getByRole('button', { name: screen.click }).first()

    if (!(await trigger.isVisible())) {
      return false
    }

    await trigger.click()
  }

  if ('press' in screen) {
    await page.keyboard.press(screen.press)
  }

  await page.waitForTimeout(600)

  return true
}

async function check({
  context,
  screen,
  viewport,
  project,
}: {
  context: BrowserContext
  screen: Screen
  viewport: keyof typeof VIEWPORTS
  project: string
}): Promise<Result> {
  const page = await context.newPage()

  await page.setViewportSize(VIEWPORTS[viewport])

  try {
    await visit({ page, screen, path: screen.path.replace('{project}', project) })
    await page.waitForTimeout(SETTLE_MS)

    if (!(await open(page, screen))) {
      return { screen: screen.name, viewport, rows: 0, mismatched: [], absent: true }
    }

    const rows = rowsOf(await page.evaluate(measure, CONTROL_SELECTOR))

    return {
      screen: screen.name,
      viewport,
      rows: rows.length,
      mismatched: rows.filter(({ spread }) => spread > TOLERANCE_PX),
    }
  } catch (error) {
    return {
      screen: screen.name,
      viewport,
      rows: 0,
      mismatched: [],
      error:
        error instanceof Error ? (error.message.split('\n')[0] ?? error.message) : String(error),
    }
  } finally {
    await page.close()
  }
}

function table(results: Result[]) {
  const lines = results.map(({ screen, viewport, rows, mismatched, error, absent }) => {
    const worst = mismatched.toSorted((first, second) => second.spread - first.spread)[0]

    const detail = absent
      ? 'not on this viewport'
      : (error ??
        (worst ? worst.controls.map(({ label, height }) => `${label} ${height}`).join(' · ') : ''))

    return `| ${screen} | ${viewport} | ${rows} | ${error ? 'error' : mismatched.length} | ${detail} |`
  })

  return [
    '| Screen | Viewport | Control rows | Unequal rows | Worst row |',
    '| --- | --- | --- | --- | --- |',
    ...lines,
  ].join('\n')
}

const browser = await chromium.launch({ channel: 'chrome' })
const signedIn = await browser.newContext()
const signedOut = await browser.newContext()

await signedIn.addCookies(cookies())

const project = await projectId(await signedIn.newPage())
const results: Result[] = []

for (const screen of SCREENS) {
  for (const viewport of Object.keys(VIEWPORTS) as (keyof typeof VIEWPORTS)[]) {
    results.push(
      await check({
        context: 'signedOut' in screen ? signedOut : signedIn,
        screen,
        viewport,
        project,
      }),
    )
  }
}

await browser.close()

process.stdout.write(`${table(results)}\n`)

if (REPORT_PATH) {
  await writeFile(REPORT_PATH, JSON.stringify(results, null, 2))
}

process.exit(
  results.some(({ mismatched, error }) => error !== undefined || mismatched.length > 0) ? 1 : 0,
)
