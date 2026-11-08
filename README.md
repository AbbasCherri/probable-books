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
`renderWithRouter` from `@/test/render`. E2E specs and helpers live in `e2e/`; screenshots go to
`e2e-artifacts/<project>/`. Playwright uses a system Chrome if found (or `PW_CHROMIUM=/path`),
otherwise run `npx playwright install chromium` once. `E2E_STRICT=1` makes the smoke spec fail
on its quality checks (h1, overflow, axe, console) instead of only annotating them.

Demo login: `demo@probable.books` / `password123`. See CONTRIBUTING.md for the workflow.
