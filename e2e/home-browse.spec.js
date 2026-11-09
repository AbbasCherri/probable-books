import { expect, test } from '@playwright/test'
import {
  collectConsole,
  expectNoOverflow,
  expectPageQuality,
  gotoStable,
  setTextZoom,
  waitForStable,
} from './helpers'

// Header and footer targets are fixed on another branch.
const EXCLUDE = ['header', 'footer']

/** Sum of layout-shift values (excluding input-driven ones) since the page started loading. */
async function trackCls(page) {
  await page.addInitScript(() => {
    window.__cls = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cls += entry.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
}

test.describe('home', () => {
  test('no layout shift while data loads', async ({ page }) => {
    await trackCls(page)
    await gotoStable(page, '/')
    const cls = await page.evaluate(() => window.__cls)
    expect(cls, 'cumulative layout shift from load').toBeLessThan(0.1)
  })

  test('quality and course lookup hero', async ({ page }) => {
    const log = collectConsole(page)
    await gotoStable(page, '/')
    const hero = page.locator('section[aria-labelledby="home-title"]')
    await expect(
      hero.getByRole('combobox', { name: 'Course code or title' }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Featured', level: 2 })).toBeVisible()
    await expectPageQuality(page, log, { exclude: EXCLUDE })
  })

  test('headline fits at 200% text zoom', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await gotoStable(page, '/')
    await setTextZoom(page, 2)
    await expectNoOverflow(page)
    const fits = await page
      .locator('#home-title')
      .evaluate((el) => el.scrollWidth <= el.clientWidth)
    expect(fits, 'headline does not overflow its box').toBe(true)
  })
})

test.describe('browse', () => {
  test('quality and headings in order', async ({ page }) => {
    const log = collectConsole(page)
    await gotoStable(page, '/browse')
    const levels = await page
      .locator('main')
      .evaluate((main) =>
        [...main.querySelectorAll('h1,h2,h3,h4')]
          .filter((h) => h.getClientRects().length > 0 || h.closest('aside'))
          .map((h) => Number(h.tagName[1])),
      )
    // Read as if after the page's h1: no heading may skip a level from the one before it.
    const order = [1, ...levels]
    for (let i = 1; i < order.length; i++) {
      expect(order[i] - order[i - 1], `heading order ${order}`).toBeLessThanOrEqual(1)
    }
    await expectPageQuality(page, log, { exclude: EXCLUDE })
  })

  test('filter change on page 2 does not move focus to the title', async ({ page }) => {
    await gotoStable(page, '/browse?page=2')
    const sort = page.getByRole('combobox', { name: 'Sort' })
    await sort.selectOption({ index: 1 })
    await waitForStable(page)
    await expect(page).not.toHaveURL(/page=2/)
    await expect(page.locator('#browse-title')).not.toBeFocused()
  })

  test('pagination moves focus to the title', async ({ page }) => {
    await gotoStable(page, '/browse')
    await page
      .getByRole('navigation', { name: /pagination|pages/i })
      .getByRole('link', { name: /^(page )?2$/i })
      .click()
    await waitForStable(page)
    await expect(page).toHaveURL(/page=2/)
    await expect(page.locator('#browse-title')).toBeFocused()
  })

  test('switching view does not refetch', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('desktop'), 'view toggle is lg+ only')
    await gotoStable(page, '/browse')
    let busy = false
    await page.exposeFunction('__markBusy', () => (busy = true))
    await page.evaluate(() => {
      new MutationObserver(() => {
        if (document.querySelector('main ul[aria-hidden="true"]')) window.__markBusy()
      }).observe(document.body, { subtree: true, childList: true, attributes: true })
    })
    await page.getByRole('group', { name: 'View' }).getByRole('button').nth(1).click()
    await waitForStable(page)
    expect(busy, 'skeleton shown after view switch').toBe(false)
  })

  test('empty search names the query', async ({ page }) => {
    await gotoStable(page, '/browse?q=zzzzz')
    await expect(page.getByText('No listings match “zzzzz”')).toBeVisible()
  })

  test('price inputs accept cents', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('desktop'), 'rail is lg+ only')
    await gotoStable(page, '/browse')
    const inputs = page.locator('aside input[type="number"]')
    await expect(inputs.first()).toHaveAttribute('step', '0.01')
    await expect(inputs.last()).toHaveAttribute('step', '0.01')
  })
})
