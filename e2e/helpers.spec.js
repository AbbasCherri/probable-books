import { expect, test } from '@playwright/test'
import {
  collectConsole,
  expectNoOverflow,
  expectOneH1,
  expectPageQuality,
  expectTargets44,
  gotoStable,
  measureOverflow,
  runAxe,
  setTheme,
  waitForStable,
} from './helpers'

// Self-tests for e2e/helpers.js on synthetic pages, so a broken helper cannot pass silently.

const page = (body, head = '') => `<!doctype html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Helper test</title>
    <style>body { margin: 0; font: 16px/1.5 sans-serif; } ${head}</style>
  </head>
  <body><main>${body}</main></body>
</html>`

test.describe('overflow', () => {
  test('reports content wider than the viewport, phones included', async ({
    page: p,
  }) => {
    const width = p.viewportSize().width + 200
    await p.setContent(
      page(`<h1>Wide</h1><div style="width:${width}px;height:10px"></div>`),
    )
    const result = await measureOverflow(p)
    expect(result.overflow).toBe(true)
    expect(result.scrollWidth).toBeGreaterThan(result.clientWidth)
    await expect(expectNoOverflow(p)).rejects.toThrow()
  })

  test('passes content that fits', async ({ page: p }) => {
    await p.setContent(page('<h1>Fits</h1><div style="width:100%;height:10px"></div>'))
    expect((await measureOverflow(p)).overflow).toBe(false)
    await expectNoOverflow(p)
  })
})

test.describe('expectOneH1', () => {
  test('counts level-1 headings by role, ignoring hidden ones', async ({ page: p }) => {
    await p.setContent(
      page('<div role="heading" aria-level="1">One</div><h1 hidden>Two</h1>'),
    )
    await expectOneH1(p)
  })

  test('fails on two', async ({ page: p }) => {
    await p.setContent(page('<h1>One</h1><h1>Two</h1>'))
    await expect(expectOneH1(p, { timeout: 500 })).rejects.toThrow()
  })
})

test.describe('expectTargets44', () => {
  const css = `
    .t { display: inline-block; box-sizing: border-box; padding: 0; border: 0; }
    .card { position: relative; width: 200px; height: 100px; }
    .card a::after { content: ''; position: absolute; inset: 0; }
  `

  test('flags targets short in either dimension, with a useful label', async ({
    page: p,
  }) => {
    await p.setContent(
      page(
        `
        <button class="t" style="width:100px;height:30px">Short</button>
        <button class="t" style="width:30px;height:60px" aria-label="Narrow"></button>
        <button class="t" style="width:100px;height:44px">Big enough</button>
        <label for="q">Search books</label>
        <input id="q" class="t" style="width:200px;height:20px" />
        <input class="t" style="width:200px;height:20px" placeholder="Course code" />
        <button id="icon-only" class="t" style="width:20px;height:20px"></button>
        `,
        css,
      ),
    )
    const labels = (await expectTargets44(p)).map((o) => o.text)
    expect(labels).toEqual([
      'Short',
      'Narrow',
      'Search books',
      'Course code',
      '#icon-only',
    ])
  })

  test('measures a stretched link by its positioned ancestor', async ({ page: p }) => {
    await p.setContent(
      page('<div class="card"><h2><a href="/x">Title</a></h2></div>', css),
    )
    expect(await expectTargets44(p)).toEqual([])
  })

  test('exempts inline links in running text, not lone small links', async ({
    page: p,
  }) => {
    await p.setContent(
      page(
        `<div>Read the <a href="/terms">terms</a> first.</div>
         <div><a href="/alone">Alone</a></div>`,
        css,
      ),
    )
    expect((await expectTargets44(p)).map((o) => o.text)).toEqual(['Alone'])
  })

  test('honours exclude and fails when strict', async ({ page: p }) => {
    await p.setContent(
      page('<button class="t skip" style="width:100px;height:20px">Tiny</button>', css),
    )
    expect(await expectTargets44(p, { exclude: ['.skip'] })).toEqual([])
    await expect(expectTargets44(p, { strict: true })).rejects.toThrow()
  })
})

test.describe('runAxe', () => {
  const lowContrast = '<h1>Title</h1><p class="faint" style="color:#ccc">Faint text</p>'

  test('reports serious violations and honours disableRules and exclude', async ({
    page: p,
  }) => {
    await p.setContent(page(lowContrast))
    expect((await runAxe(p)).map((v) => v.id)).toContain('color-contrast')
    expect(await runAxe(p, { disableRules: ['color-contrast'] })).toEqual([])
    expect(await runAxe(p, { exclude: ['.faint'] })).toEqual([])
  })
})

test.describe('expectPageQuality', () => {
  test('passes a clean page', async ({ page: p }) => {
    const log = collectConsole(p)
    await p.setContent(page('<h1>Clean</h1><p>Body text.</p>'))
    await expectPageQuality(p, log)
  })

  test('fails on a console error', async ({ page: p }) => {
    const log = collectConsole(p)
    await p.setContent(page('<h1>Noisy</h1><script>console.error("boom")</script>'))
    expect(log.errors().map((e) => e.text)).toEqual(['boom'])
    await expect(expectPageQuality(p, log)).rejects.toThrow()
  })
})

test.describe('waitForStable', () => {
  test('waits for aria-busy placeholders to clear', async ({ page: p }) => {
    const start = Date.now()
    await p.setContent(
      page(`<h1>Loading</h1><div id="busy" aria-busy="true"></div>
        <script>setTimeout(() => document.getElementById('busy').remove(), 800)</script>`),
    )
    await waitForStable(p)
    // One-shot checks: a retrying assertion here would hide a waitForStable that returns early.
    expect(await p.locator('[aria-busy="true"]').count()).toBe(0)
    expect(Date.now() - start).toBeGreaterThanOrEqual(700)
  })
})

test.describe('setTheme', () => {
  test('seeds once per tab, so an in-app change survives reload', async ({ page: p }) => {
    await setTheme(p, 'night')
    await gotoStable(p, '/login')
    await expect(p.locator('html')).toHaveAttribute('data-theme', 'night')
    await p.evaluate(() => localStorage.setItem('pb.theme', 'day'))
    await p.reload()
    await expect(p.locator('html')).toHaveAttribute('data-theme', 'day')
  })
})
