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
