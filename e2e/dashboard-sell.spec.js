import { expect, test } from '@playwright/test'
import {
  collectConsole,
  expectPageQuality,
  gotoStable,
  signIn,
  waitForStable,
} from './helpers'

// Dashboard (5.6) and the sell form (5.5) polish. Seed ids from src/services/mock.
// usr_demo owns lst_002 (kit, four pending offers), lst_003 (CLRS), lst_004 (one pending
// offer) and the draft lst_028.

const fastMock = (context) =>
  context.addInitScript(() => {
    try {
      localStorage.setItem('pb.mock.latency', '0')
    } catch {
      /* storage blocked */
    }
  })

const isWide = (page) => page.viewportSize().width >= 768

/** Cumulative layout shift from page load, ignoring shifts right after input. */
async function trackCls(page) {
  await page.addInitScript(() => {
    window.__cls = 0
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value
    }).observe({ type: 'layout-shift', buffered: true })
  })
}

/** The row-actions menu button for a listing, in whichever layout is showing. */
const actionsFor = (page, title) =>
  page.getByRole('button', { name: `Actions for ${title}` }).locator('visible=true')

test.describe('dashboard', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context)
  })

  test('loads without layout shift', async ({ page }) => {
    await trackCls(page)
    const log = collectConsole(page)
    await gotoStable(page, '/dashboard')
    await expect(page.getByText(/active, .* waiting/)).toBeVisible()
    const cls = await page.evaluate(() => window.__cls)
    expect(cls, 'cumulative layout shift').toBeLessThan(0.1)
    await expectPageQuality(page, log, { exclude: ['header', 'footer'] })
  })

  test('menu actions keep focus on the menu button', async ({ page, context }) => {
    await fastMock(context)
    await gotoStable(page, '/dashboard')
    const title = 'Introduction to Algorithms, 4th edition'
    const button = actionsFor(page, title)
    await button.click()
    await page.getByRole('menuitem', { name: 'Mark reserved' }).click()
    await expect(button).toBeFocused()
    await waitForStable(page)
    await expect(button).toBeFocused()
    await expect(button).toBeEnabled()
  })

  test('after delete, focus lands on the page title', async ({ page, context }) => {
    await fastMock(context)
    await gotoStable(page, '/dashboard')
    const title = 'Introduction to Algorithms, 4th edition'
    await actionsFor(page, title).click()
    await page.getByRole('menuitem', { name: 'Delete listing' }).click()
    const dialog = page.getByRole('dialog', { name: 'Delete this listing?' })
    await dialog.getByRole('button', { name: 'Delete listing' }).click()
    await expect(dialog).toBeHidden()
    await waitForStable(page)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Your ledger' }),
    ).toBeFocused()
    await expect(actionsFor(page, title)).toHaveCount(0)
  })

  test('drafts read Draft, not Pending', async ({ page, context }) => {
    await fastMock(context)
    await gotoStable(page, '/dashboard')
    const draftTitle = 'University Physics, 15th edition, with lab manual'
    const row = isWide(page)
      ? page.getByRole('row').filter({ hasText: draftTitle })
      : page.getByRole('listitem').filter({ hasText: draftTitle })
    await expect(row.getByText('Draft', { exact: true })).toBeVisible()
    await expect(row.getByText('Pending', { exact: true })).toHaveCount(0)
  })

  test('reserved listing hides Accept on other pending offers', async ({
    page,
    context,
  }) => {
    await fastMock(context)
    await gotoStable(page, '/dashboard?tab=received')
    const section = page
      .locator('section')
      .filter({ has: page.locator('#offers-for-lst_002') })
    const first = section.getByRole('article').first()
    await first.getByRole('button', { name: 'Accept' }).click()
    await page.getByRole('button', { name: /Keep them pending/ }).click()
    await waitForStable(page)
    const pending = section
      .getByRole('article')
      .filter({ has: page.getByRole('button', { name: 'Decline' }) })
    await expect(pending.first()).toBeVisible()
    await expect(section.getByRole('button', { name: 'Accept' })).toHaveCount(0)
  })
})

test.describe('sell form', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context)
    await fastMock(context)
  })

  test('optional fields use the optional marker', async ({ page }) => {
    await gotoStable(page, '/sell')
    await expect(page.getByText(/\(optional\)|, optional/)).toHaveCount(0)
    for (const id of [
      'listing-author',
      'listing-edition',
      'listing-isbn',
      'listing-retail',
    ]) {
      await expect(page.locator(`label[for="${id}"]`)).toContainText('optional')
    }
  })

  test('Publish in the preview sheet submits the form', async ({ page }) => {
    test.skip(
      page.viewportSize().width >= 1024,
      'the preview sheet is phones and tablets',
    )
    await gotoStable(page, '/sell')
    await page.getByRole('button', { name: 'Preview' }).click()
    const sheet = page.getByRole('dialog', { name: 'How buyers see it' })
    await sheet.getByRole('button', { name: 'Publish listing' }).click()
    await expect(sheet).toBeHidden()
    await expect(
      page.getByRole('region', { name: /Fix \d+ things to publish/ }),
    ).toBeVisible()
  })

  test('editing a seed listing saves and returns to it', async ({ page }) => {
    const log = collectConsole(page)
    await gotoStable(page, '/listings/lst_003/edit')
    const title = page.getByLabel('Title')
    await title.fill('Introduction to Algorithms, 4th edition, CLRS')
    const save = page
      .getByRole('button', { name: 'Save changes' })
      .locator('visible=true')
    await save.click()
    await expect(page).toHaveURL(/\/listings\/lst_003$/)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Introduction to Algorithms, 4th edition, CLRS',
      }),
    ).toBeVisible()
    expect(log.errors()).toEqual([])
  })
})
