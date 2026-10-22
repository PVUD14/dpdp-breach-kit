# Release readiness — claims and evidence

Every claim made in [README.md](../README.md) (technical claims now in
[DEVELOPERS.md](DEVELOPERS.md); hosting in [decisions/0001-hosting.md](decisions/0001-hosting.md)) and [launch/linkedin-post.md](launch/linkedin-post.md),
with the evidence for it and who has checked it. Prepared 2026-10-22.

**How to read the Status column**

- **Verified (agent)** — a command was run in this repository and its output showed the claim
  holds, in the environment noted. Passing tests show the code is *consistent with its own
  specification*; they are **not** evidence that the legal reading is correct.
- **Needs human** — the claim depends on judgement, legal reading, an external source, or an
  environment the agent did not test. See [VERIFICATION.md](VERIFICATION.md).
- **Unverified** — no command proved it; it rests on code reading or on documentation only.

Environment for agent checks: Windows 11, Node 22.18.0, Chrome (local), TypeScript 7.0.2,
Vite 8.3.5, Vitest 5.0.5. No Linux, macOS or other browser was tested. CI has not run yet.

## README

| # | Claim | Evidence | Status |
|---|---|---|---|
| R1 | Draft aid, not legal advice. | Statement in README, every draft starts with "DRAFT AID — NOT LEGAL ADVICE" (`tests/generators.test.ts` "starts with the draft-aid header"). | Header: Verified (agent). Whether the positioning is legally adequate: **Needs human**. |
| R2 | The breach checklist reports facts against the definition; it is not a legal decision. | `src/core/checklist.ts`; `tests/checklist.test.ts` (outcomes `required`, `not_required_on_facts_given`, `requires_legal_determination`, `indeterminate`; AMB-05, AMB-15, AMB-17 interpretations). | Behaviour: Verified (agent). Correctness of the reading of s.2(u)/s.17(1): **Needs human**. |
| R3 | Ambiguities are flagged with `AMB-xx` references, not resolved silently. | `tests/traceability.test.ts` (every cited AMB exists, each has a choice and alternatives); `tests/generators.test.ts` (AMB list in every draft). | Consistency: Verified (agent). That every real ambiguity in the text has been identified: **Needs human**. |
| R4 | Rule 7 commences "eighteen months after the date of publication in the Official Gazette" (r. 1(4) as corrected by G.S.R. 892(E)); published 13 Nov 2025. | `docs/requirements.md` §2; source PDFs in `docs/source/` (hashes: `npm run verify:sources`). | File integrity: Verified (agent). Quotation against printed pages: **Needs human**. |
| R5 | Computed commencement 13 May 2027; alternative 14 May 2027 (AMB-14). | `src/core/commencement.ts`; `tests/commencement.test.ts`. | Arithmetic: Verified (agent). Legal method of computing "eighteen months after": **Needs human**. |
| R6 | As of 2026-10-22, Rule 7 is not yet in force on that computation. | `commencementBanner("2026-10-22T…")` returns `before_computed_date` (`tests/commencement.test.ts`, `tests/ui-model.test.ts`). | On the computation: Verified (agent). Absence of any amending notification: **Needs human**. |
| R7 | No amendment to the Rules after the 10 Dec 2025 corrigendum found as of 2026-10-22; search not exhaustive. | `docs/requirements.md` §7 item 1 (web search, e-Gazette not searched directly). | **Needs human** (e-Gazette search). |
| R8 | No official Board breach-report format, template or portal found as of 2026-10-22. | `docs/requirements.md` §6. | **Needs human** (recheck; result can change). |
| R9 | Board drafts are plain text organised by Rule 7(2) content; not an official form; no channel assumed. | `src/generators/boardReports.ts`; `tests/generators.test.ts` (headings map one-to-one to BR-BD-01…08). | Verified (agent). |
| R10 | Architecture diagram (input → checks → generators → drafts). | Mermaid block in README; module structure in `src/index.ts`, `src/core`, `src/generators`. | **Unverified**: the diagram was not rendered (no offline Mermaid renderer); structure matches by code reading only. |
| R11 | `src/core` has no DOM, network or storage access. | `tests/security.test.ts` (source scan for DOM globals and network/storage APIs). | Verified (agent) — static scan, not a runtime proof. |
| R12 | Missing facts appear as `[NOT PROVIDED]`; nothing is invented. | `tests/generators.test.ts`: complete and minimal incidents, all 2⁸/2⁶/2¹³ missing-field combinations, minimal-incident lines all placeholders. | Verified (agent) for the template text. Human read-through of drafts: **Needs human** (VERIFICATION "Draft read-through"). |
| R13 | The page must be served over HTTP(S); `file://` does not work. | Browser ES-module behaviour; not exercised. | **Unverified**. |
| R14 | Copy-to-clipboard needs a secure context; otherwise the page asks you to copy manually. | `src/ui/app.ts` fallback message; `npm run check:network` "copy reports a status" on `127.0.0.1`. | Secure-context path: Verified (agent). Non-secure fallback: **Unverified**. |
| R15 | CSP set by `<meta>`; send it as a header when hosting (only way to add `frame-ancestors`). | `index.html`; `tests/security.test.ts` (directives asserted). | CSP content: Verified (agent). Hosting advice: guidance, **Unverified**. |
| R16 | The page makes no network requests. | `npm run check:network` (18/18; any request outside the page's origin or CSP violation fails; planted cross-origin `fetch` was detected); `tests/security.test.ts`; built-bundle scan. | Verified (agent) on Windows + Chrome. Other browsers/OS and DevTools check: **Needs human**. Linux CI job not yet run. |
| R17 | No browser storage, cookies or service workers; record kept in memory only. | `npm run check:network` (storage/cookie/service-worker checks); `tests/security.test.ts`. | Verified (agent) on Windows + Chrome. |
| R18 | Imported files are schema-checked; unknown fields rejected. | `tests/ui-model.test.ts`, `tests/schema.test.ts` (incl. `__proto__`, `constructor`, `toString`, `hasOwnProperty` regressions); `npm run check:network` "import rejects an unknown field". | Verified (agent). |
| R19 | Do not enter personal data; the record holds counts and descriptions only. | Schema has no fields for names or contacts; free-text fields can still hold anything a user types. | Schema shape: Verified (agent) (`tests/schema.test.ts`). That users comply: **cannot be verified** — warning only. |
| R20 | Arrow-key navigation between draft tabs and a label on every input checked automatically; full keyboard use not tested. | `npm run check:network` ("ArrowRight moves to the next draft tab", "every input, select and textarea has a label"). | Verified (agent) for those two checks only. Lighthouse / screen reader: **Needs human**. |
| R21 | Six fictional tabletop scenarios, each 60–90 min, T+0 to T+72h injects, importable example record; ambiguities posed as questions. | `tests/tabletop.test.ts` (six scenarios and examples, sections, T+0/T+72h rows, AMB rows end in "?", examples load through `parseIncidentFile`, cited IDs exist). | Structure: Verified (agent). Timing (60–90 min) and that no scenario implies a legal conclusion: **Needs human** (never run with participants). |
| R22 | Fictional organisations; no real people, brands or data. | Names invented for this pack; `tests/tabletop.test.ts` checks examples for `@` and 10-digit runs. | **Needs human** (name collision check against real organisations). |
| R23 | Timestamps need an explicit offset; offset-less times are rejected. | `tests/time.test.ts`, `tests/schema.test.ts`. | Verified (agent). |
| R24 | IST entry and display; no DST, so 72 hours is exactly 72 elapsed hours. | `tests/time.test.ts`, `tests/deadline.test.ts` (DST-zone inputs, exact boundary). | Verified (agent). |
| R25 | Re-exported records use `+05:30`; the instant is unchanged. | `tests/ui-model.test.ts` "re-expresses other offsets in IST without changing the instant". | Verified (agent). |
| R26 | The form records times to the second; sub-second fractions are dropped on edit and export. | `tests/ui-model.test.ts` "keeps whole seconds and drops sub-second fractions…". | Verified (agent). |
| R27 | The deadline needs an explicit clock basis; no default (AMB-01, AMB-13). Exactly 72:00:00 is reported "at deadline" (AMB-18). | `tests/deadline.test.ts`, `tests/ui-model.test.ts` (panels wait for a basis). | Verified (agent). |
| R28 | Requires Node.js 22.12 or later. | `package.json` `engines`; Vitest 5.0.5 declares `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`. | Verified (agent) by reading installed package metadata; older Node versions not tried. |
| R29 | `npm run check`, `typecheck`, `test`, `build`, `check:network`, `verify:sources` behave as described. | Final acceptance run (see release report); `verify:sources` negative cases (tampered, extra, missing file) all exit 1. | Verified (agent) on Windows, from both `E:\` and `e:\` working directories. |
| R30 | `npm test` works from a lower-case Windows drive letter. | `scripts/run-vitest.mjs`; 3/3 runs from a lower-case and 3/3 from an upper-case drive-letter working directory pass. | Verified (agent). |
| R31 | `check:network` runs in CI as a non-blocking job until its first green Linux run. | `.github/workflows/ci.yml` (`continue-on-error: true`). | Configuration present; **Unverified** (CI not run). |
| R32 | Licensed under Apache-2.0. | `LICENSE` is the unmodified official text from https://www.apache.org/licenses/LICENSE-2.0.txt (SHA-256 `cfc7749b…3d30`, fetched and compared byte-for-byte); `NOTICE` names the copyright holder; `package.json` `license`. | Text identical to the ASF original: Verified (agent). Owner's right to license (employer IP terms): **Needs human**. |

## LinkedIn draft

| # | Claim | Evidence | Status |
|---|---|---|---|
| L1 | "I have published dpdp-breach-kit". | Not yet published (no git operations performed). | **Needs human** — true only after the owner publishes. |
| L2 | Open source. | `LICENSE` (Apache-2.0). | **Needs human** — true once the repository is public. |
| L3 | Produces three plain-text drafts (Data Principal notice, Board initial, Board detailed report). | `tests/generators.test.ts`. | Verified (agent). |
| L4 | Unrecorded facts stay visible as `[NOT PROVIDED]`; nothing is filled in. | As R12. | Verified (agent) for the template text. |
| L5 | Ambiguities such as "becoming aware" (AMB-01) and "exactly 72 hours" (AMB-18) are flagged and cited, not answered. | `tests/deadline.test.ts` (AMB-01, AMB-18 interpretations); drafts' AMB list. | Verified (agent). |
| L6 | Runs locally in the browser; no network calls; stores nothing. | As R16–R17. | Verified (agent) on Windows + Chrome; **Needs human** for other environments. |
| L7 | Six fictional tabletop scenarios for the 72-hour window. | As R21. | Verified (agent) for structure. |
| L8 | Drafts only; not legal advice; not a compliance guarantee. | Positioning statement. | **Needs human**. |
| L9 | Commencement and the Board's process should be checked before relying on anything. | As R5–R8. | Advisory; no verification needed. |

## Not claimed

The README and launch draft deliberately make no claim of: legal correctness, compliance,
completeness of the ambiguity list, being first or best, filing readiness, accessibility beyond
R20, or support for any browser other than the one tested.
