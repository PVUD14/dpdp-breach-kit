# Contributing

This project is a draft aid for intimation under Rule 7 of the DPDP Rules, 2025. It is not legal
advice. Requirements, sources and known ambiguities are in
[docs/requirements.md](docs/requirements.md).

## Ground rules

- **No real personal data, anywhere.** Not in tests, fixtures, issues, pull requests, screenshots
  or logs. Use obviously synthetic values (for example `INC-TEST-0001`, "Synthetic test
  environment") and counts instead of people.
- **Scope changes need maintainer approval first.** Open an issue and get agreement before working
  on anything outside the issue's stated scope, including new dependencies, network access,
  storage, or changes to what the page collects.
- **Rule interpretation needs maintainer approval.** Do not resolve an ambiguity in code or docs
  on your own. Use the "Rule interpretation" issue template. Code that touches an ambiguity must
  return an `interpretation` entry citing its `AMB-xx` ID from `docs/requirements.md`, and must
  not make the choice silently.
- Quote the official text only. Do not use secondary summaries as a source for requirements.

## Workflow

1. Open or pick an issue.
2. Create **one branch per issue**, e.g. `123-short-description`.
3. Keep the change to that issue's scope.
4. Run the checks below locally.
5. Open a pull request that links the issue (`Closes #123`).
6. **One approving review** is required before merge. Changes to `docs/requirements.md` or to how an
   ambiguity is handled also need the maintainer's approval.

## Checks

Node.js 22.12 or later.

```sh
npm ci
npm run check       # strict compiler checks (not ESLint; see README); `npm run lint` is an alias
npm run typecheck
npm test
npm run build
npm run verify:sources  # SHA-256 of docs/source/ against docs/requirements.md
npm run check:network   # needs a local Chrome/Chromium; see README
```

### Windows: drive-letter case

With a lower-case drive letter in the working directory (`e:\repo` rather than `E:\repo`), Vitest
resolves the same files under two path spellings, loads its runner twice, and every test file
fails at its first `describe` with `TypeError: Cannot read properties of undefined (reading
'config')` and "no tests". The mismatch happens before `vite.config.ts` is read, so it cannot be
fixed there. `npm test` therefore runs Vitest through `scripts/run-vitest.mjs`, which restarts it
with the drive letter upper-cased; it passes from both `E:\` and `e:\`. If you run `npx vitest`
directly, do so from an upper-case drive path.

## Tests

- Add a test with every behaviour change. For a fix, the test must fail without the fix.
- Fixtures live in `tests/fixtures.ts` and must stay synthetic.
- Do not weaken the guards in `tests/security.test.ts` (network, storage, `innerHTML`/`eval`, CSP)
  without maintainer approval.
