## What changed

## Doc section

<!-- e.g. 5.2 Browse Listings -->

## Screenshots

Phone (360px) first, then 768px and 1280px.

## Checklist

- [ ] Matches its spec in section 5, including loading, empty and error states
- [ ] Tokens and shared components only; no banned patterns from section 2
- [ ] Built phone first; checked at 360, 768 and 1280px
- [ ] Keyboard-only run-through; visible focus; one h1; landmarks in place
- [ ] Contrast 4.5:1 (3:1 large text and input borders); nothing depends on colour or hover alone
- [ ] Inputs labelled; errors tied with aria-describedby and say how to fix
- [ ] Dynamic changes announced via aria-live; dialogs trap focus, close on Esc, return focus
- [ ] prefers-reduced-motion respected
- [ ] `npm run lint` and `npm run build` pass; no `console.log`
- [ ] Touches `src/components/`, `src/styles/`, `src/lib/`, `src/services/` or `src/app/`? Then it is its own PR and needs 2 approvals

## If this touches server/

- [ ] Endpoint(s) and requirements section: <!-- e.g. GET /listings, 5.2 -->
- [ ] Swagger block added or updated
- [ ] Tests cover success and every listed failure
- [ ] Messages match the requirements document exactly
- [ ] Any new migration is a new file; no merged migration was edited
- [ ] No secrets, `.env` files or personal data
- [ ] Contract changed? Then the requirements PDF is updated and the other three teammates are tagged

Closes #
