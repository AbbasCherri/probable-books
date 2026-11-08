# Contributing

GitHub Flow. `main` is always working and deployable.

## Rules

- No direct pushes to `main`; open a pull request. Squash merge only.
- 1 approval minimum. PRs touching `src/components/`, `src/styles/`, `src/lib/`, `src/services/` or `src/app/` need **2** approvals and go in their own PR.
- `npm run lint` and `npm run build` must pass (CI checks both).
- Review within 24 hours. Rotation: Abbas reviews Wazan, Wazan reviews Youssef, Youssef reviews Ayk, Ayk reviews Abbas.

## Branches

`<type>/<scope>-<short-description>`, lowercase with hyphens. Types: `feat`, `fix`, `ui`, `refactor`, `chore`, `docs`.
Keep them short-lived (1 to 3 days); split big pages into several branches.

## Commits

Conventional Commits: `type(scope): summary`, imperative, under 72 characters.
Scopes: home, browse, listing, course, sell, dashboard, auth, ui, annotate, api, setup.

## Daily routine

```
git switch main && git pull
git switch -c feat/browse-filter-rail
git fetch origin && git rebase origin/main   # at least once a day
git push -u origin feat/browse-filter-rail   # after a rebase: --force-with-lease
```

Force-push only your own branch, only with `--force-with-lease`.

## Code conventions

- Components: `PascalCase.jsx`, one per file, named exports. Pages are the only default exports.
- Import with `@/`, never `../../..`.
- Tailwind tokens only (no raw hex, no arbitrary values). Unprefixed classes are the phone layout; add `sm:` `md:` `lg:`; never `max-*` to undo desktop styles.
- Components never fetch data; pages use `@/services/api`. Never import mock data into a page.
- Money is integer cents; format with `formatPrice()`.
- Enum labels live in `src/lib/constants.js`.
