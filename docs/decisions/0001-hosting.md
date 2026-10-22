# 0001 — Host the intake page on GitHub Pages

**Status:** accepted, 2026-10-22, by the maintainer (PVUDivakar). Closes the "Decide whether to host
the intake page" item in [BACKLOG.md](../BACKLOG.md).

## Context

The intake page must be served over HTTP(S) and cannot be opened from `file://`. Until now the only
way to try it was to install Node.js and run `npm run build` and `npm run preview`, which keeps out
the non-technical readers it is written for (DPOs, compliance and legal teams, small-business
founders).

## Options weighed

| | No hosting | GitHub Pages | Another host with HTTP headers |
|---|---|---|---|
| Convenience | Needs Node.js and a terminal | One link, no install | One link, no install |
| CSP | `<meta>` only | `<meta>` only; Pages cannot send custom headers | Can be sent as a header |
| `frame-ancestors` (clickjacking) | Up to whoever serves it | **Not available** | Available |
| Cost and upkeep | None | None; built by a pinned-SHA workflow | An account and config outside GitHub |
| Users treating it as an official or "safe" place for real data | Low | Real risk | Real risk |
| Versioning and cache | Whatever the user built | Always the latest `main`; browsers may cache an older build briefly | Same as Pages |

## Decision

Publish `dist/app/` to GitHub Pages from `main` with `.github/workflows/pages.yml`, with these
limits stated:

- The CSP is set only by `<meta>`; there is no `frame-ancestors` protection, so another site could
  embed the page in a frame. The page holds no secrets or sessions and makes no network requests,
  which limits what a framing site could gain, but a user could be tricked into typing into a
  framed copy. Anyone who needs that protection should self-host behind a server that sends the CSP
  as an HTTP header (see [DEVELOPERS.md](../DEVELOPERS.md)).
- The hosted copy is not an official government service. The README says it is a drafting aid,
  that what is typed stays in the browser, and that no personal details should be entered; the page
  repeats the warning.
- The hosted copy always reflects the latest `main`. There is no versioned URL.

## Evidence

- `npm run check:network` passed 18/18 against the built `dist/app/` on 2026-10-22 (Windows 11,
  local Chrome).
- The built page was served from the sub-path `/dpdp-breach-kit/`, as Pages serves it, and rendered
  with every asset loaded (relative `base: "./"` in `vite.config.ts`).
- Not yet verified: a live deployment. The first run of the workflow needs Settings → Pages →
  Source: "GitHub Actions".
