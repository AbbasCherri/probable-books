import { expect, test } from '@playwright/test'
import { gotoStable, runAxe, setTheme, signIn, waitForStable } from './helpers'

// Shared UI foundation: layout frame, route-change focus, Night contrast and type tokens.

test('footer sits at the bottom of a short page', async ({ page }) => {
  await gotoStable(page, '/missing')
  const { footerBottom, viewport, docHeight } = await page.evaluate(() => ({
    footerBottom: document.querySelector('footer').getBoundingClientRect().bottom,
    viewport: window.innerHeight,
    docHeight: document.documentElement.scrollHeight,
  }))
  // Only meaningful when the page is shorter than the screen.
  test.skip(docHeight > viewport + 1, 'page taller than the viewport')
  expect(Math.abs(footerBottom - viewport)).toBeLessThanOrEqual(2)
})

test('a route change moves focus to main and announces the page', async ({ page }) => {
  await gotoStable(page, '/login')
  await page.getByRole('contentinfo').getByRole('link', { name: 'Browse' }).click()
  await expect(page).toHaveURL(/\/browse$/)
  await waitForStable(page)
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('main')
  await expect(page.getByTestId('route-announcer')).toHaveText(/Browse/)
})

test('a search-param change does not move focus', async ({ page }) => {
  await gotoStable(page, '/browse')
  const sort = page.getByLabel('Sort')
  await sort.focus()
  await sort.selectOption('price_asc')
  await expect(page).toHaveURL(/sort=price_asc/)
  await waitForStable(page)
  await expect(sort).toBeFocused()
})

for (const route of [
  { path: '/', name: 'home' },
  { path: '/browse', name: 'browse' },
  { path: '/dashboard', name: 'dashboard', auth: true },
]) {
  test(`Night colour contrast is clean on ${route.name}`, async ({ page, context }) => {
    await setTheme(page, 'night')
    if (route.auth) await signIn(context)
    await gotoStable(page, route.path)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
    const contrast = (await runAxe(page)).filter((v) => v.id === 'color-contrast')
    expect(contrast).toEqual([])
  })
}

test('Night follows the system setting when no theme is saved', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' })
  const page = await context.newPage()
  await gotoStable(page, '/missing')
  const night = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  await page.emulateMedia({ colorScheme: 'light' })
  const day = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(night).toBe('rgb(23, 29, 48)')
  expect(day).toBe('rgb(245, 242, 234)')
  await context.close()
})

test('no element uses a default Tailwind text size', async ({ page, context }) => {
  await signIn(context)
  const offenders = []
  for (const path of ['/', '/browse', '/dashboard', '/sell', '/login', '/missing']) {
    await gotoStable(page, path)
    const found = await page.evaluate(() =>
      [...document.querySelectorAll('[class]')]
        .map((el) => el.getAttribute('class'))
        .filter((c) => /\btext-(xs|sm|base|lg|xl|2xl|3xl)\b/.test(c)),
    )
    found.forEach((c) => offenders.push(`${path}: ${c}`))
  }
  expect(offenders).toEqual([])
})

for (const { os, saved, bg, scheme } of [
  { os: 'dark', saved: 'day', bg: 'rgb(245, 242, 234)', scheme: 'light' },
  { os: 'light', saved: 'night', bg: 'rgb(23, 29, 48)', scheme: 'dark' },
]) {
  test(`a saved ${saved} theme overrides an OS set to ${os}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: os })
    const page = await context.newPage()
    await setTheme(page, saved)
    await gotoStable(page, '/login')
    const styles = await page.evaluate(() => ({
      bg: getComputedStyle(document.body).backgroundColor,
      input: getComputedStyle(document.querySelector('input')).colorScheme,
    }))
    expect(styles.bg).toBe(bg)
    expect(styles.input).toBe(scheme)
    await context.close()
  })
}

test('switching dashboard tabs does not move focus', async ({ page, context }) => {
  await signIn(context)
  await gotoStable(page, '/dashboard')
  const tab = page.getByRole('tab', { name: /Offers received/ })
  await tab.click()
  await expect(page).toHaveURL(/tab=received/)
  await waitForStable(page)
  await expect(tab).toBeFocused()
})

test('labels are body weight; listing titles are semibold', async ({ page, context }) => {
  await signIn(context)
  await gotoStable(page, '/sell')
  const weight = (locator) => locator.evaluate((el) => getComputedStyle(el).fontWeight)
  expect(await weight(page.locator('label[for="listing-title"]'))).toBe('400')
  expect(await weight(page.locator('label[for="listing-courses"]'))).toBe('400')
  expect(await weight(page.locator('legend', { hasText: 'Category' }))).toBe('400')
  expect(await weight(page.getByText('Open to offers', { exact: true }))).toBe('400')
  await gotoStable(page, '/browse')
  expect(await weight(page.locator('article h2').first())).toBe('600')
})

/** Standard deviation of luminance in a patch of empty page: paper grain makes it > 0. */
async function grainStrength(page) {
  const png = await page.screenshot({ clip: { x: 10, y: 300, width: 200, height: 120 } })
  return page.evaluate(
    async (src) => {
      const img = new Image()
      img.src = src
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, img.width, img.height)
      const lum = []
      for (let i = 0; i < data.length; i += 4)
        lum.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])
      const mean = lum.reduce((a, b) => a + b, 0) / lum.length
      return Math.sqrt(lum.reduce((a, b) => a + (b - mean) ** 2, 0) / lum.length)
    },
    `data:image/png;base64,${png.toString('base64')}`,
  )
}

test('paper grain shows, fainter at night, and never blocks clicks', async ({
  browser,
}) => {
  const strengths = {}
  for (const theme of ['day', 'night']) {
    const context = await browser.newContext()
    const page = await context.newPage()
    await setTheme(page, theme)
    await gotoStable(page, '/missing')
    strengths[theme] = await grainStrength(page)
    // The grain layer sits under the content: the point at the footer link hits the link.
    const link = page.getByRole('contentinfo').getByRole('link', { name: 'Browse' })
    const box = await link.boundingBox()
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('a')?.textContent,
      [box.x + box.width / 2, box.y + box.height / 2],
    )
    expect(hit).toBe('Browse')
    await context.close()
  }
  expect(strengths.day).toBeGreaterThan(0.5)
  expect(strengths.night).toBeGreaterThan(0.2)
  expect(strengths.night).toBeLessThan(strengths.day)
})

// The first page's code arrives late (slow network): the loading frame must not jump the layout
// when the page replaces it. Cumulative layout shift from navigation start, Core Web Vitals
// "good" is 0.1; we hold the fallback to 0.05. A short page and a tall one. (Pages whose own
// loading states shift, like / and /dashboard today, belong in their page specs.)
for (const { path, chunk } of [
  { path: '/listings/lst_001', chunk: /\/src\/pages\/listing-details\// },
  { path: '/browse', chunk: /\/src\/pages\/browse\/BrowsePage/ },
]) {
  test(`no layout shift while ${path} loads slowly`, async ({ page }) => {
    await page.addInitScript(() => {
      window.__cls = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (!entry.hadRecentInput) window.__cls += entry.value
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.route(chunk, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.continue()
    })
    await gotoStable(page, path)
    const cls = await page.evaluate(() => window.__cls)
    expect(cls, 'cumulative layout shift').toBeLessThan(0.05)
  })
}
