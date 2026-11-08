import { expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const pick = (soft) => (soft ? expect.soft : expect)

/**
 * Navigate and wait until the page has settled: network idle, web fonts loaded, no
 * [aria-busy="true"] placeholders, and the DOM quiet for a moment (the mock API answers
 * after a 250-600ms timer, which network idle cannot see).
 */
export async function gotoStable(page, path) {
  const response = await page.goto(path, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page
    .locator('[aria-busy="true"]')
    .first()
    .waitFor({ state: 'detached', timeout: 10_000 })
    .catch(() => {})
  await page.evaluate(
    ({ quietMs, maxMs }) =>
      new Promise((resolve) => {
        let timer
        const done = () => {
          observer.disconnect()
          clearTimeout(cap)
          resolve()
        }
        const observer = new MutationObserver(() => {
          clearTimeout(timer)
          timer = setTimeout(done, quietMs)
        })
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true,
        })
        timer = setTimeout(done, quietMs)
        const cap = setTimeout(done, maxMs)
      }),
    { quietMs: 400, maxMs: 5_000 },
  )
  await page.evaluate(() => document.fonts.ready)
  return response
}

/** { scrollWidth, innerWidth, overflow } for the document, without asserting. */
export async function measureOverflow(page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  return { scrollWidth, innerWidth, overflow: scrollWidth > innerWidth }
}

/** The page must not scroll sideways: documentElement.scrollWidth <= innerWidth. */
export async function expectNoOverflow(page, { soft = false } = {}) {
  const result = await measureOverflow(page)
  pick(soft)(
    result.scrollWidth,
    'horizontal overflow (scrollWidth vs innerWidth)',
  ).toBeLessThanOrEqual(result.innerWidth)
  return result
}

/** Exactly one <h1> on the page. */
export async function expectOneH1(page, { soft = false } = {}) {
  await pick(soft)(page.locator('h1'), 'exactly one h1').toHaveCount(1)
}

/**
 * Touch targets at least 44px tall. Checks visible button, a[href], input (not checkbox, radio,
 * hidden), select, textarea, [role=tab] and [role=option]. Inline text links inside a <p> are
 * exempt (WCAG 2.5.8 inline exception). Returns the offenders; only fails when `strict`.
 *   const offenders = await expectTargets44(page)            // report
 *   await expectTargets44(page, { strict: true })            // hard fail
 */
export async function expectTargets44(page, { strict = false, min = 44 } = {}) {
  const offenders = await page.evaluate((minPx) => {
    const selector = [
      'button',
      'a[href]',
      'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])',
      'select',
      'textarea',
      '[role="tab"]',
      '[role="option"]',
    ].join(',')
    const out = []
    for (const el of document.querySelectorAll(selector)) {
      if (el.closest('[inert], [hidden], [aria-hidden="true"]')) continue
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.display === 'none') continue
      const rect = el.getBoundingClientRect()
      if (rect.width <= 1 || rect.height <= 1) continue // sr-only and collapsed elements
      // Off-page (e.g. the skip link parked above the viewport until focused).
      if (rect.bottom + window.scrollY <= 0 || rect.right + window.scrollX <= 0) continue
      const inlineTextLink =
        el.tagName === 'A' && style.display === 'inline' && el.closest('p') !== null
      if (inlineTextLink) continue
      if (rect.height >= minPx) continue
      out.push({
        tag: el.tagName.toLowerCase(),
        text: (
          el.getAttribute('aria-label') ||
          el.textContent ||
          el.getAttribute('name') ||
          ''
        )
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 60),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      })
    }
    return out
  }, min)
  if (strict) expect(offenders, `targets shorter than ${min}px`).toEqual([])
  return offenders
}

/** axe-core against WCAG 2.0/2.1/2.2 A and AA; returns only serious and critical violations. */
export async function runAxe(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
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

/** Sign in as the demo user by seeding pb.session before the app boots (once per tab). */
export async function signIn(context, userId = 'usr_demo') {
  await context.addInitScript((id) => {
    try {
      if (sessionStorage.getItem('pb.e2e.signedIn')) return
      sessionStorage.setItem('pb.e2e.signedIn', '1')
      localStorage.setItem('pb.session', JSON.stringify({ userId: id }))
    } catch {
      /* storage blocked */
    }
  }, userId)
}

/** 'day' | 'night' | 'system'. Saved as raw pb.theme before navigation; html gets data-theme. */
export async function setTheme(page, theme) {
  await page.addInitScript((t) => {
    try {
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
