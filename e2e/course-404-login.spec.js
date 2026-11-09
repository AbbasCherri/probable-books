import { expect, test } from '@playwright/test'
import { collectConsole, expectPageQuality, gotoStable, waitForStable } from './helpers'

// Course Details (5.4), Login (5.7), Not found (5.9).
const setLatency = (context, ms) =>
  context.addInitScript((value) => {
    try {
      localStorage.setItem('pb.mock.latency', value)
    } catch {
      /* storage blocked */
    }
  }, String(ms))

// Shared header/footer targets are fixed on another branch.
const CHROME = { exclude: ['header', 'footer'] }

test.describe('not found', () => {
  test.beforeEach(({ context }) => setLatency(context, 0))

  test('torn-out page with Home and Browse', async ({ page }) => {
    const log = collectConsole(page)
    await gotoStable(page, '/no-such-page')
    await expect(page).toHaveTitle(/Page not found/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'This page was torn out.',
    )
    const main = page.locator('main')
    await expect(main.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    await expect(main.getByRole('link', { name: 'Browse' })).toHaveAttribute(
      'href',
      '/browse',
    )
    await expectPageQuality(page, log, CHROME)
  })
})

test.describe('course details', () => {
  test('header and section counts agree', async ({ page, context }) => {
    await setLatency(context, 0)
    const log = collectConsole(page)
    await gotoStable(page, '/courses/CHEM-201')
    const stats = await page.locator('main header p').first().textContent()
    const forSale = /^(\d+) for sale/.exec(stats)?.[1]
    expect(forSale, `stats line: ${stats}`).toBeTruthy()
    const count = page.locator(
      '[aria-labelledby="listings-heading"] [aria-live="polite"]',
    )
    await expect(count).toContainText(`${forSale} for sale`)
    await expectPageQuality(page, log, CHROME)
  })

  test('sort keeps the select mounted and focused', async ({ page, context }) => {
    await setLatency(context, 800)
    await gotoStable(page, '/courses/CHEM-201')
    const select = page.getByLabel('Sort')
    await select.focus()
    await select.evaluate((el) => (el.dataset.marker = 'kept'))
    await select.selectOption('price_asc')
    // The grid reloads with skeletons; the select and count stay put.
    await expect(page.getByText('Loading listings…')).toBeAttached()
    await expect(select).toHaveAttribute('data-marker', 'kept')
    await expect(select).toBeFocused()
    await waitForStable(page)
    await expect(page).toHaveURL(/sort=price_asc/)
    await expect(select).toHaveAttribute('data-marker', 'kept')
    await expect(select).toBeFocused()
  })
})

test.describe('login', () => {
  test('shows Signing in… while submitting, no inert Remember me', async ({
    page,
    context,
  }) => {
    await setLatency(context, 1500)
    const log = collectConsole(page)
    await gotoStable(page, '/login')
    await expect(page.getByLabel('Remember me')).toHaveCount(0)
    await expectPageQuality(page, log, CHROME)
    await page.getByLabel('Email').fill('demo@probable.books')
    await page.getByLabel('Password', { exact: true }).fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('button', { name: 'Signing in…' })).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })
})
