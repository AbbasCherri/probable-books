import { expect, test } from '@playwright/test'
import {
  collectConsole,
  expectPageQuality,
  expectTargets44,
  gotoStable,
  setTheme,
  shot,
  signIn,
  waitForStable,
} from './helpers'

// Listing Details (doc 5.3). Seed ids from src/services/mock/listings.js.
const ID = {
  open: 'lst_006', // Lina's lab coat: $12, open to offers, one photo, CHEM 201
  pending: 'lst_001', // usr_demo already has a pending $40 offer on it
  sixPhotos: 'lst_022', // six photos, MATH 218
  noPhotos: 'lst_015', // no photos, CHEM 201
  longTitle: 'lst_016', // 120-character title
  longWord: 'lst_017', // one 40-character word
  reserved: 'lst_014', // reserved for someone else, no photos
  sold: 'lst_025', // sold, closed to offers
  firm: 'lst_007', // not open to offers
  mine: 'lst_002', // usr_demo's active kit
  draft: 'lst_028', // usr_demo's draft
}
const LISTING = (id) => `/listings/${id}`

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('pb.mock.latency', '0')
    } catch {
      /* storage blocked */
    }
  })
})

const isWide = (page) => page.viewportSize().width >= 1024
const h1 = (page) => page.getByRole('heading', { level: 1 })
const offerButton = (page) => page.getByRole('button', { name: 'Make an offer' })

// Known issues in shared components, reported separately (not this page's to fix):
// - SiteHeader/SiteFooter have targets under 44px (logo, Sell, Get a card, Sign out).
// - ListingCard's "+n courses" chip is text-on-mark on bg-paper-200, unreadable in Night.
const SHARED_CHROME = ['body header', 'body footer']
const MORE_CHIP = 'article .bg-paper-200'

/** expectPageQuality, scoped past the shared-component issues above. */
async function expectQuality(page, log) {
  await expectPageQuality(page, log, {
    targets: false,
    axeOptions: { exclude: [MORE_CHIP] },
  })
  await expectTargets44(page, { strict: true, exclude: SHARED_CHROME })
}

async function open(page, id) {
  const log = collectConsole(page)
  await gotoStable(page, LISTING(id))
  return log
}

test.describe('active listing, open to offers', () => {
  test('signed out: page reads right and Make an offer asks to sign in', async ({
    page,
  }, testInfo) => {
    const log = await open(page, ID.open)
    await expect(h1(page)).toHaveText('Lab coat, size M')
    await expect(page).toHaveTitle('Lab coat, size M | Probable Books')
    if (page.viewportSize().width >= 640)
      await expect(page.getByText('Listing, CHEM 201', { exact: true })).toBeVisible()
    // Course tabs are links to their course pages.
    await expect(
      page.getByRole('link', { name: 'CHEM 201', exact: true }),
    ).toHaveAttribute('href', '/courses/CHEM-201')
    await expect(page.getByText('Open to offers')).toBeVisible()
    // Seller block: name, member since, active listings, pickup spot.
    const seller = page.getByRole('region', { name: 'Lina K.' })
    await expect(seller).toContainText('Member since')
    await expect(seller).toContainText(/\d+ active listings?/)
    await expect(seller).toContainText('Science building lobby')
    // No email for signed-out visitors.
    await expect(page.getByRole('link', { name: 'Contact seller' })).toHaveCount(0)
    await expect(page.getByText('lina@probable.books')).toHaveCount(0)
    // "Also for CHEM 201", without this listing.
    const shelf = page.getByRole('region', { name: 'Also for CHEM 201' })
    await expect(shelf).toBeVisible()
    await expect(shelf.getByRole('link', { name: 'Lab coat, size M' })).toHaveCount(0)
    await expectQuality(page, log)
    await shot(page, testInfo, 'listing-open-signed-out-day')

    await offerButton(page).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.getByLabel('Email').fill('demo@probable.books')
    await page.getByLabel('Password', { exact: true }).fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(new RegExp(`${LISTING(ID.open)}$`))
    await expect(h1(page)).toHaveText('Lab coat, size M')
  })

  test('signed in: validates the offer, sends it, and it shows in offers sent', async ({
    page,
  }, testInfo) => {
    await signIn(page)
    const log = await open(page, ID.open)
    // Contact seller: a mailto link, with the address shown as text.
    await expect(page.getByRole('link', { name: 'Contact seller' })).toHaveAttribute(
      'href',
      'mailto:lina@probable.books',
    )
    await expect(page.getByText('lina@probable.books')).toBeVisible()

    await offerButton(page).click()
    const dialog = page.getByRole('dialog', { name: 'Make an offer' })
    await expect(dialog).toBeVisible()
    const amount = dialog.getByLabel('Your offer, in dollars')
    await expect(amount).toBeFocused()
    await expect(amount).toHaveAttribute('inputmode', 'decimal')
    await expectQuality(page, log)
    await shot(page, testInfo, 'listing-offer-dialog-day')

    const send = dialog.getByRole('button', { name: 'Send offer' })
    await amount.fill('0')
    await send.click()
    await expect(dialog.getByText('Enter an amount above $0.')).toBeVisible()
    await expect(amount).toBeFocused()
    await expect(amount).toHaveAttribute('aria-invalid', 'true')

    await amount.fill('12.01')
    await send.click()
    await expect(dialog.getByText('Offer at most the asking price, $12.')).toBeVisible()

    await amount.fill('4.555')
    await send.click()
    await expect(dialog.getByText(/dollars and cents/)).toBeVisible()

    await amount.fill('10.50')
    const message = dialog.getByLabel(/Message/)
    await message.fill('x'.repeat(281))
    await expect(dialog.getByText('281 of 280 characters')).toBeVisible()
    await send.click()
    await expect(dialog.getByText(/Keep the message to 280 characters/)).toBeVisible()
    await expect(message).toBeFocused()

    await message.fill('Can meet at the science building after 3.')
    await send.click()
    await expect(dialog).toHaveCount(0)
    await expect(
      page.getByRole('status').getByText(/Offer of \$10\.50 sent/),
    ).toBeVisible()
    // Focus lands on the confirmation, which links to the dashboard.
    const sent = page.getByText(/You offered \$10\.50/)
    await expect(sent).toBeFocused()
    await expect(offerButton(page)).toBeDisabled()
    await expectQuality(page, log)

    await page.getByRole('link', { name: 'See offers you sent' }).click()
    await expect(page).toHaveURL(/\/dashboard\?tab=sent$/)
    await waitForStable(page)
    await expect(page.getByText('Lab coat, size M').first()).toBeVisible()
    await expect(page.getByText('$10.50').first()).toBeVisible()
  })

  test('signed in with an offer already waiting: no second offer', async ({ page }) => {
    await signIn(page)
    const log = await open(page, ID.pending)
    await expect(page.getByText(/You offered \$40/)).toBeVisible()
    await expect(offerButton(page)).toBeDisabled()
    await expectQuality(page, log)
  })

  test('Esc closes the offer dialog and focus returns to its trigger', async ({
    page,
  }) => {
    await signIn(page)
    await open(page, ID.open)
    await offerButton(page).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(offerButton(page)).toBeFocused()
  })
})

test.describe('closed listings', () => {
  test('reserved: stamp and the reason offers are off', async ({ page }) => {
    const log = await open(page, ID.reserved)
    await expect(page.getByText('Reserved', { exact: true }).first()).toBeVisible()
    await expect(offerButton(page)).toBeDisabled()
    await expect(page.getByText(/accepted an offer/)).toBeVisible()
    await expectQuality(page, log)
  })

  test('sold: SOLD stamp over the gallery and the reason', async ({ page }, testInfo) => {
    const log = await open(page, ID.sold)
    await expect(
      page.getByTestId('gallery').getByText('Sold', { exact: true }),
    ).toBeVisible()
    await expect(offerButton(page)).toBeDisabled()
    await expect(page.getByText(/This sold/)).toBeVisible()
    await expectQuality(page, log)
    await shot(page, testInfo, 'listing-sold-day')
  })

  test('firm price: no offers, says why', async ({ page }) => {
    const log = await open(page, ID.firm)
    await expect(page.getByText('Firm price', { exact: true }).first()).toBeVisible()
    await expect(offerButton(page)).toBeDisabled()
    await expect(page.getByText(/isn.t taking offers/)).toBeVisible()
    await expectQuality(page, log)
  })
})

test.describe('own listing', () => {
  test('owner sees Edit listing and Mark as sold, and can mark it sold', async ({
    page,
  }, testInfo) => {
    await signIn(page)
    const log = await open(page, ID.mine)
    await expect(offerButton(page)).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Edit listing' })).toHaveAttribute(
      'href',
      `/listings/${ID.mine}/edit`,
    )
    await expect(page.getByRole('link', { name: 'Contact seller' })).toHaveCount(0)
    await expectQuality(page, log)
    await shot(page, testInfo, 'listing-owner-day')

    const markSold = page.getByRole('button', { name: 'Mark as sold' })
    await markSold.click()
    let dialog = page.getByRole('dialog', { name: 'Mark this as sold?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Keep it listed' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(markSold).toBeFocused()

    await markSold.click()
    dialog = page.getByRole('dialog', { name: 'Mark this as sold?' })
    await expectQuality(page, log)
    await dialog.getByRole('button', { name: 'Mark as sold' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('status').getByText(/Marked as sold/)).toBeVisible()
    await expect(
      page.getByTestId('gallery').getByText('Sold', { exact: true }),
    ).toBeVisible()
    await expect(markSold).toBeDisabled()
    await expect(page.getByText(/You marked this sold/)).toBeFocused()
    await expectQuality(page, log)
  })

  test('owner sees their draft', async ({ page }) => {
    await signIn(page)
    const log = await open(page, ID.draft)
    await expect(h1(page)).toHaveText(/University Physics/)
    await expect(page.getByText(/Only you can see this/)).toBeVisible()
    await expectQuality(page, log)
  })
})

test.describe('not found', () => {
  for (const [name, id, user] of [
    ['unknown id', 'lst_nope', null],
    ['draft, signed out', ID.draft, null],
    ['draft, someone else', ID.draft, 'usr_lina'],
  ]) {
    test(`${name}: the page was torn out`, async ({ page }) => {
      if (user) await signIn(page, user)
      const log = await open(page, id)
      await expect(h1(page)).toHaveText('This page was torn out.')
      await expect(
        page.getByRole('main').getByRole('link', { name: 'Home' }),
      ).toHaveAttribute('href', '/')
      await expect(
        page.getByRole('main').getByRole('link', { name: 'Browse listings' }),
      ).toHaveAttribute('href', '/browse')
      await expectQuality(page, log)
    })
  }
})

test.describe('gallery', () => {
  test('six photos: arrow keys, Home/End and the photo buttons', async ({
    page,
  }, testInfo) => {
    const log = await open(page, ID.sixPhotos)
    const gallery = page.getByTestId('gallery')
    const main = gallery.getByRole('img').first()
    await expect(main).toHaveAttribute('alt', /photo 1 of 6/)
    const buttons = gallery.getByRole('button', { name: /^Show photo/ })
    await expect(buttons).toHaveCount(6)
    await expect(buttons.nth(0)).toHaveAttribute('aria-current', 'true')

    await buttons.nth(0).focus()
    await page.keyboard.press('ArrowRight')
    await expect(main).toHaveAttribute('alt', /photo 2 of 6/)
    await expect(buttons.nth(1)).toHaveAttribute('aria-current', 'true')
    await expect(buttons.nth(1)).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect(main).toHaveAttribute('alt', /photo 6 of 6/)
    await page.keyboard.press('Home')
    await expect(main).toHaveAttribute('alt', /photo 1 of 6/)
    await page.keyboard.press('End')
    await expect(main).toHaveAttribute('alt', /photo 6 of 6/)

    await buttons.nth(3).click()
    await expect(main).toHaveAttribute('alt', /photo 4 of 6/)
    await expect(gallery.locator('[aria-live="polite"]')).toHaveText(/^Photo 4 of 6: /)
    await expectQuality(page, log)
    await shot(page, testInfo, 'listing-six-photos-day')
  })

  test('no photos: index-card placeholder and no controls', async ({ page }) => {
    const log = await open(page, ID.noPhotos)
    const gallery = page.getByTestId('gallery')
    await expect(gallery.getByText('Organic Chemistry study guide')).toBeVisible()
    await expect(gallery.getByRole('button')).toHaveCount(0)
    await expectQuality(page, log)
  })

  test('one photo: no controls', async ({ page }) => {
    await open(page, ID.open)
    const gallery = page.getByTestId('gallery')
    await expect(gallery.getByRole('img')).toHaveAttribute('alt', /Lab coat, size M/)
    await expect(gallery.getByRole('button')).toHaveCount(0)
  })
})

test.describe('long content', () => {
  for (const id of [ID.longTitle, ID.longWord]) {
    test(`${id}: no sideways scroll`, async ({ page }, testInfo) => {
      const log = await open(page, id)
      await expectQuality(page, log)
      if (id === ID.longTitle) await shot(page, testInfo, 'listing-long-title-day')
    })
  }

  test('line breaks in the description are kept', async ({ page }) => {
    await open(page, 'lst_023')
    const text = await page.getByTestId('description').evaluate((el) => el.innerText)
    expect(text).toContain("What's included:\n- The textbook")
  })
})

test('the bottom bar never hides focused content (phones and tablets)', async ({
  page,
}) => {
  test.skip(isWide(page), 'the sticky bar is below lg only')
  await open(page, ID.noPhotos)
  const bar = page.getByTestId('action-bar')
  await expect(bar).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  const link = page.getByRole('link', { name: /^See everything for/ })
  await link.focus()
  // Tabbing down scrolls just enough to reveal the next control, flush with the bottom edge
  // (minus scroll-padding). element.focus() centres instead, so align to the end explicitly.
  await link.evaluate((el) => el.scrollIntoView({ block: 'end', behavior: 'instant' }))
  const gap = async () => {
    const [l, b] = await Promise.all([link.boundingBox(), bar.boundingBox()])
    return b.y - (l.y + l.height)
  }
  await expect.poll(gap, { timeout: 5_000 }).toBeGreaterThanOrEqual(0)
  await expect(link).toBeInViewport()
})

test('a failed load says so and Retry recovers', async ({ page, context }, testInfo) => {
  await context.addInitScript(() => localStorage.setItem('pb.mock.fail', 'getListing'))
  const log = await open(page, ID.open)
  await expect(h1(page)).toHaveText(/didn.t print/)
  await expectQuality(page, log)
  await shot(page, testInfo, 'listing-error-day')
  await page.evaluate(() => localStorage.removeItem('pb.mock.fail'))
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(h1(page)).toHaveText('Lab coat, size M')
  await expect(h1(page)).toBeFocused()
})

test.describe('night', () => {
  test.beforeEach(async ({ page }) => {
    await setTheme(page, 'night')
  })

  test('open listing and the offer dialog', async ({ page }, testInfo) => {
    await signIn(page)
    const log = await open(page, ID.sixPhotos)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
    await expectQuality(page, log)
    await shot(page, testInfo, 'listing-open-night')
    await offerButton(page).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectQuality(page, log)
    await shot(page, testInfo, 'listing-offer-dialog-night')
  })

  test('sold, owner and not-found states', async ({ page }, testInfo) => {
    await signIn(page)
    let log = await open(page, ID.sold)
    await expectQuality(page, log)
    await shot(page, testInfo, 'listing-sold-night')
    log = await open(page, ID.mine)
    await expectQuality(page, log)
    await shot(page, testInfo, 'listing-owner-night')
    log = await open(page, 'lst_nope')
    await expectQuality(page, log)
    await shot(page, testInfo, 'listing-not-found-night')
  })
})
