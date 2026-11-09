import { expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const pick = (soft) => (soft ? expect.soft : expect)

/**
 * Wait until the current page has settled: network idle, web fonts loaded, no
 * [aria-busy="true"] placeholders, and the DOM quiet for a moment (the mock API answers after a
 * 250-600ms timer, which network idle cannot see). Use after navigation or an interaction.
 */
export async function waitForStable(page, { quietMs = 400, maxMs = 5_000 } = {}) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 10_000 })
  await page.evaluate(
    ({ quiet, max }) =>
      new Promise((resolve) => {
        let timer
        const done = () => {
          observer.disconnect()
          clearTimeout(cap)
          resolve()
        }
        const observer = new MutationObserver(() => {
          clearTimeout(timer)
          timer = setTimeout(done, quiet)
        })
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true,
        })
        timer = setTimeout(done, quiet)
        const cap = setTimeout(done, max)
      }),
    { quiet: quietMs, max: maxMs },
  )
  await page.evaluate(() => document.fonts.ready)
}

/** page.goto(path) then waitForStable(page). Returns the navigation response. */
export async function gotoStable(page, path) {
  const response = await page.goto(path, { waitUntil: 'networkidle' })
  await waitForStable(page)
  return response
}

/**
 * { scrollWidth, clientWidth, innerWidth, overflow } for the document, without asserting.
 * Compares against documentElement.clientWidth, not window.innerWidth: on mobile emulation
 * (isMobile) Chromium zooms out to fit wide content, so innerWidth grows to match scrollWidth
 * and the overflow would never show. clientWidth stays the layout viewport width.
 */
export async function measureOverflow(page) {
  const m = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
  }))
  return { ...m, overflow: m.scrollWidth > m.clientWidth }
}

/** The page must not scroll sideways: documentElement scrollWidth <= clientWidth. */
export async function expectNoOverflow(page, { soft = false } = {}) {
  const result = await measureOverflow(page)
  pick(soft)(
    result.scrollWidth,
    'horizontal overflow (documentElement scrollWidth vs clientWidth)',
  ).toBeLessThanOrEqual(result.clientWidth)
  return result
}

/** Exactly one visible level-1 heading (<h1> or role="heading" aria-level="1"). */
export async function expectOneH1(page, { soft = false, timeout } = {}) {
  await pick(soft)(
    page.getByRole('heading', { level: 1 }),
    'exactly one level-1 heading',
  ).toHaveCount(1, { timeout })
}

/**
 * Touch targets at least `min` px (default 44) in BOTH width and height. Returns the offenders
 * ({ tag, text, width, height }); only fails when `strict`.
 *   const offenders = await expectTargets44(page)                       // report
 *   await expectTargets44(page, { strict: true, exclude: ['.skip-link'] }) // hard fail
 *
 * Checked: visible button, a[href], input (not checkbox/radio/hidden), select, textarea,
 * [role=tab], [role=option], minus anything matching (or inside) an `exclude` selector.
 * Effective area:
 *   - normally the element's own border box;
 *   - a stretched link (its ::after has content and is position absolute/fixed) is measured by
 *     the box of its nearest positioned ancestor, which is what the overlay covers;
 *   - an inline link (computed display: inline) whose nearest block-level ancestor has other,
 *     non-whitespace text is exempt: WCAG 2.5.8's inline exception for links in a sentence.
 */
export async function expectTargets44(
  page,
  { strict = false, min = 44, exclude = [] } = {},
) {
  const offenders = await page.evaluate(
    ({ minPx, excludeSelectors }) => {
      const selector = [
        'button',
        'a[href]',
        'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])',
        'select',
        'textarea',
        '[role="tab"]',
        '[role="option"]',
      ].join(',')
      const clean = (s) => (s || '').trim().replace(/\s+/g, ' ').slice(0, 60)

      function shortSelector(el) {
        if (el.id) return `#${el.id}`
        const classes = [...el.classList].slice(0, 2).map((c) => `.${CSS.escape(c)}`)
        return el.tagName.toLowerCase() + classes.join('')
      }
      function label(el) {
        return (
          clean(el.getAttribute('aria-label')) ||
          clean(el.labels?.[0]?.textContent) ||
          clean(el.textContent) ||
          clean(el.getAttribute('placeholder')) ||
          clean(el.getAttribute('name')) ||
          shortSelector(el)
        )
      }
      function isStretched(el) {
        const after = getComputedStyle(el, '::after')
        return (
          after.content !== 'none' &&
          after.content !== 'normal' &&
          (after.position === 'absolute' || after.position === 'fixed')
        )
      }
      function positionedAncestor(el) {
        for (let node = el.parentElement; node; node = node.parentElement) {
          if (getComputedStyle(node).position !== 'static') return node
        }
        return document.documentElement
      }
      function inSentence(el) {
        let block = el.parentElement
        while (block && getComputedStyle(block).display.startsWith('inline'))
          block = block.parentElement
        if (!block) return false
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!el.contains(node) && node.data.trim()) return true
        }
        return false
      }

      const out = []
      for (const el of document.querySelectorAll(selector)) {
        if (el.closest('[inert], [hidden], [aria-hidden="true"]')) continue
        if (excludeSelectors.some((s) => el.closest(s))) continue
        const style = getComputedStyle(el)
        if (style.visibility === 'hidden' || style.display === 'none') continue
        const own = el.getBoundingClientRect()
        if (own.width <= 1 || own.height <= 1) continue // sr-only and collapsed elements
        // Off-page (e.g. the skip link parked above the viewport until focused).
        if (own.bottom + window.scrollY <= 0 || own.right + window.scrollX <= 0) continue
        if (el.tagName === 'A' && style.display === 'inline' && inSentence(el)) continue
        const rect = isStretched(el)
          ? positionedAncestor(el).getBoundingClientRect()
          : own
        if (Math.min(rect.width, rect.height) >= minPx) continue
        out.push({
          tag: el.tagName.toLowerCase(),
          text: label(el),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        })
      }
      return out
    },
    { minPx: min, excludeSelectors: exclude },
  )
  if (strict) expect(offenders, `targets smaller than ${min}x${min}px`).toEqual([])
  return offenders
}

/**
 * axe-core against WCAG 2.0/2.1/2.2 A and AA; returns only serious and critical violations.
 *   await runAxe(page, { include: ['main'], exclude: ['.third-party'], disableRules: ['region'] })
 */
export async function runAxe(
  page,
  { include = [], exclude = [], disableRules = [] } = {},
) {
  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21aa',
    'wcag22aa',
  ])
  include.forEach((s) => (builder = builder.include(s)))
  exclude.forEach((s) => (builder = builder.exclude(s)))
  if (disableRules.length) builder = builder.disableRules(disableRules)
  const results = await builder.analyze()
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      count: v.nodes.length,
      targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
    }))
}

/**
 * The hard quality gate for page specs: exactly one h1, no horizontal overflow, no serious or
 * critical axe violations, every target at least 44x44 (strict), and no console errors or page
 * errors. `log` comes from collectConsole(page), started before navigating.
 *   const log = collectConsole(page)
 *   await gotoStable(page, '/browse')
 *   await expectPageQuality(page, log, { exclude: ['.skip-link'] })
 * Options: axe/targets (false to skip that check), exclude (selectors skipped by both),
 * axeOptions (passed to runAxe).
 */
export async function expectPageQuality(
  page,
  log,
  { axe = true, targets = true, exclude = [], axeOptions = {} } = {},
) {
  await expectOneH1(page)
  await expectNoOverflow(page)
  if (axe) {
    const violations = await runAxe(page, {
      ...axeOptions,
      exclude: [...exclude, ...(axeOptions.exclude ?? [])],
    })
    expect(violations, 'axe serious/critical violations').toEqual([])
  }
  if (targets) await expectTargets44(page, { strict: true, exclude })
  expect(log.errors(), 'console errors and page errors').toEqual([])
}

/**
 * Start recording console errors/warnings and uncaught page errors. Call before navigating.
 *   const log = collectConsole(page)
 *   ...
 *   expect(log.errors()).toEqual([])
 */
export function collectConsole(page) {
  const messages = []
  page.on('console', (msg) => {
    const type = msg.type()
    if (type === 'error' || type === 'warning') messages.push({ type, text: msg.text() })
  })
  page.on('pageerror', (error) => {
    messages.push({ type: 'pageerror', text: error.message })
  })
  return {
    messages,
    errors: () => messages.filter((m) => m.type !== 'warning'),
    warnings: () => messages.filter((m) => m.type === 'warning'),
  }
}

/**
 * Sign in as the demo user by seeding pb.session before the app boots. Seeds once per tab
 * (sessionStorage flag), so signing out in the app sticks across reloads.
 * `target` is a Page or a BrowserContext (every page in it).
 */
export async function signIn(target, userId = 'usr_demo') {
  await target.addInitScript((id) => {
    try {
      if (sessionStorage.getItem('pb.e2e.signedIn')) return
      sessionStorage.setItem('pb.e2e.signedIn', '1')
      localStorage.setItem('pb.session', JSON.stringify({ userId: id }))
    } catch {
      /* storage blocked */
    }
  }, userId)
}

/**
 * 'day' | 'night' | 'system'. Saved as raw pb.theme before the app boots; html gets data-theme.
 * Seeds once per tab (sessionStorage flag), so a theme change made in the app survives reloads.
 * `target` is a Page or a BrowserContext (every page in it).
 */
export async function setTheme(target, theme) {
  await target.addInitScript((t) => {
    try {
      if (sessionStorage.getItem('pb.e2e.theme')) return
      sessionStorage.setItem('pb.e2e.theme', '1')
      if (t === 'system') localStorage.removeItem('pb.theme')
      else localStorage.setItem('pb.theme', t)
    } catch {
      /* storage blocked */
    }
  }, theme)
}

/** Simulate a larger browser text size: root font-size = factor * 100%. Call after goto. */
export async function setTextZoom(page, factor = 2) {
  await page.evaluate((f) => {
    document.documentElement.style.fontSize = `${f * 100}%`
  }, factor)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())))
}

/** Full-page screenshot to e2e-artifacts/<project>/<name>.png, also attached to the report. */
export async function shot(page, testInfo, name) {
  const path = `e2e-artifacts/${testInfo.project.name}/${name}.png`
  await page.screenshot({ path, fullPage: true, animations: 'disabled' })
  await testInfo.attach(name, { path, contentType: 'image/png' })
  return path
}
