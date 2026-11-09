import { expect, test } from '@playwright/test'
import {
  collectConsole,
  expectTargets44,
  gotoStable,
  measureOverflow,
  runAxe,
  setTheme,
  shot,
  signIn,
} from './helpers'

// Every page, Day and Night.
// Hard checks are structural (a crash fails the run): the page loads, stays where we asked, the
// theme applies, there is at least one level-1 heading, and no console errors or page errors.
// Quality checks (exactly one h1, no overflow, axe serious/critical, 44px targets) are always
// recorded as test annotations (see the HTML report). They only fail the run, as soft
// assertions, with E2E_STRICT=1, so known issues on main are reported without blocking.
// Page specs should call expectPageQuality() instead, which hard-asserts all of them.
const STRICT = Boolean(process.env.E2E_STRICT)

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/browse', name: 'browse' },
  { path: '/courses/chem-201', name: 'course-chem-201' },
  { path: '/login', name: 'login' },
  { path: '/missing', name: 'not-found' },
  { path: '/dashboard', name: 'dashboard', auth: true },
  { path: '/sell', name: 'sell', auth: true },
]
const THEMES = ['day', 'night']

for (const theme of THEMES) {
  test.describe(theme, () => {
    for (const route of ROUTES) {
      test(`${route.name} ${route.path}`, async ({ page, context }, testInfo) => {
        const note = (type, description) =>
          testInfo.annotations.push({ type, description })
        const log = collectConsole(page)
        await setTheme(page, theme)
        if (route.auth) await signIn(context)

        const response = await gotoStable(page, route.path)
        expect(response?.ok(), 'document loads').toBe(true)
        await expect(page).toHaveURL(new RegExp(`${route.path}$`))
        if (theme === 'night') {
          await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
        }

        await shot(page, testInfo, `${route.name}-${theme}`)
        await expect(
          page.getByRole('heading', { level: 1 }).first(),
          'at least one level-1 heading (the page rendered)',
        ).toBeVisible()

        const h1Count = await page.getByRole('heading', { level: 1 }).count()
        const overflow = await measureOverflow(page)
        const violations = await runAxe(page)
        const targets = await expectTargets44(page)

        const issues = []
        if (h1Count !== 1) issues.push(`level-1 heading count is ${h1Count}`)
        if (overflow.overflow)
          issues.push(`overflow ${overflow.scrollWidth} > ${overflow.clientWidth}`)
        violations.forEach((v) =>
          issues.push(`axe ${v.impact} ${v.id} x${v.count}: ${v.targets.join(', ')}`),
        )

        note('issues', String(issues.length))
        issues.forEach((issue) => note('issue', issue))
        note('targets < 44px', String(targets.length))
        targets.forEach((t) =>
          note('small target', `${t.tag} "${t.text}" ${t.width}x${t.height}`),
        )
        log.warnings().forEach((w) => note('console warning', w.text))
        log.errors().forEach((e) => note('console error', `${e.type}: ${e.text}`))

        if (STRICT) {
          expect.soft(h1Count, 'exactly one level-1 heading').toBe(1)
          expect
            .soft(overflow.scrollWidth, 'no horizontal overflow')
            .toBeLessThanOrEqual(overflow.clientWidth)
          expect.soft(violations, 'axe serious/critical violations').toEqual([])
          expect.soft(targets, 'targets smaller than 44x44px').toEqual([])
        }
        expect(log.errors(), 'console errors and page errors').toEqual([])
      })
    }
  })
}
