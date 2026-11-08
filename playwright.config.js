import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

const PORT = 5174
const BASE_URL = `http://localhost:${PORT}`

// Use a system Chrome/Chromium when there is one (no `playwright install` needed locally).
// PW_CHROMIUM overrides; with neither, Playwright's bundled Chromium is used (CI).
const SYSTEM_BROWSERS = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]
const executablePath =
  process.env.PW_CHROMIUM || SYSTEM_BROWSERS.find((path) => existsSync(path))

// Device matrix: name-WIDTHxHEIGHT. Phones and tablets get touch and mobile emulation.
const DEVICES = [
  'phone-320x568',
  'phone-360x800',
  'phone-375x667',
  'phone-390x844',
  'phone-414x896',
  'phone-430x932',
  'phone-land-667x375',
  'phone-land-844x390',
  'tablet-600x960',
  'tablet-768x1024',
  'tablet-820x1180',
  'tablet-land-1024x768',
  'tablet-1024x1366',
  'desktop-1280x800',
  'desktop-1440x900',
  'desktop-1920x1080',
  'desktop-2560x1440',
]

const projects = DEVICES.map((name) => {
  const [, width, height] = /-(\d+)x(\d+)$/.exec(name).map(Number)
  const handheld = !name.startsWith('desktop')
  return {
    name,
    use: {
      browserName: 'chromium',
      viewport: { width, height },
      hasTouch: handheld,
      isMobile: handheld,
      deviceScaleFactor: handheld ? 2 : 1,
    },
  }
})

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  // Each worker is a whole browser plus dev-server traffic; half the cores starved a busy
  // 16 GB machine into timeouts. Override with --workers.
  workers: process.env.CI ? 2 : '25%',
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects,
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
