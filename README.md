# Probable Books

Student marketplace for used textbooks, calculators and lab gear, tagged by course code. Frontend phase: React + Vite + Tailwind 4, mock API.

```
npm install
npm run dev        # http://localhost:5173, check /styleguide
npm run lint && npm run build
```

## Scripts

```
npm test               # unit/component tests (Vitest + Testing Library), once
npm run test:watch     # same, re-running on save
npm run e2e            # Playwright, every device project (starts dev server on :5174)
npm run e2e -- --project=phone-360x800 --project=desktop-1280x800
npm run lint           # ESLint, including tests
npm run format:check   # Prettier, no writes (npm run format to fix)
```

Unit tests live next to the code as `*.test.js(x)`; render routed components with
`renderWithRouter` from `@/test/render`. E2E specs and helpers live in `e2e/`
(`e2e/helpers.spec.js` tests the helpers themselves); screenshots go to `e2e-artifacts/<project>/`.

- **Page specs** call `expectPageQuality(page, log)` from `e2e/helpers.js`. It hard-fails on more
  than one h1, horizontal overflow, serious/critical axe violations, targets under 44x44px and
  console errors.
- **The smoke spec** (`e2e/smoke.spec.js`) only hard-fails on crashes: no level-1 heading, console
  errors, wrong URL. The other checks become annotations in `playwright-report/`, and fail only
  with `E2E_STRICT=1`.

E2E environment variables:

| Variable      | Effect                                                                    |
| ------------- | ------------------------------------------------------------------------- |
| `PW_CHROMIUM` | Browser binary. Default: a system Chrome/Chromium locally, bundled in CI. |
| `PW_PORT`     | Dev-server port (default 5174), to run several checkouts side by side.    |
| `PW_REUSE=1`  | Reuse a server already on `PW_PORT` instead of starting one (not in CI).  |
| `E2E_STRICT`  | Make the smoke spec's quality checks fail the run.                        |

With no system Chrome, run `npx playwright install chromium` once.

## Deploying

`npm run build` writes a static site to `dist/`. Every route is client-side, so the host must
answer unknown paths with `index.html`: `public/_redirects` (`/* /index.html 200`) does that on
Netlify and Cloudflare Pages. On another host, add the equivalent rewrite (Vercel: a
`vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`).

Demo login: `demo@probable.books` / `password123`. See CONTRIBUTING.md for the workflow.
