# Human verification checklist

Everything here needs a person. Automated checks (`npm run check`, `typecheck`, `test`, `build`,
`check:network`, `verify:sources`, `npm audit`) show the code is internally consistent; they do
**not** show the legal reading is correct. Tick a box only after you have done the check yourself,
and note who did it and when. Boxes are deliberately left unticked in the repository.

Record: reviewer, date, and what you looked at, next to each item you complete.

## Sources

- [ ] **PDF hash match.** Run `npm run verify:sources` and confirm all four files PASS. Then
  download each PDF again yourself from the URL in `docs/requirements.md` §1 (official
  meity.gov.in links) and confirm the SHA-256 matches the recorded value. A match only proves the
  file is unchanged since download, not that the URL is the authoritative copy.
- [ ] **Quoted phrases.** Spot-check every quoted phrase in `docs/requirements.md` §2–§5 against the
  printed pages of the PDFs (Rules English text, printed p. 24–26; Act; G.S.R. 843(E); G.S.R.
  892(E)). The quotes were taken from machine-extracted text, with spacing artefacts normalised.
- [ ] **Schedule penalty row (AMB-16).** Open the Act PDF, printed p. 21, and confirm that "May
  extend to two hundred crore rupees" is in the same row as the breach of the obligation under
  s.8(6). It was paired by row order in extracted text.
- [ ] **Hindi vs English Rule 7.** Compare the Hindi text of Rule 7 (Rules PDF, printed p. 4) with
  the English (printed p. 26) and note any difference in meaning.
- [ ] **Amendments and corrigenda on the e-Gazette.** Search egazette.gov.in directly for any
  amendment or corrigendum to G.S.R. 846(E) after 10 December 2025, and for any corrigendum to
  G.S.R. 843(E). Record the search date. Update the README "as of" date only if you do this.
- [ ] **Act s.2(u) citation.** Confirm in the Act PDF that the definition of "personal data breach"
  is clause (u) of section 2, and that the README, code (`src/core/checklist.ts`) and
  `docs/requirements.md` all cite it as s.2(u).
- [ ] **Board format or portal.** Check again whether the Data Protection Board has published a
  breach-intimation format, template or portal, and record the URL and date (README states "none
  found as of 2026-10-22").

## Code and drafts

- [ ] **Five-test independent review.** Pick five tests at random from `tests/` that a person
  other than the author has not read. For each, confirm it tests what its name says, that it
  would fail if the behaviour broke, and that its fixture is synthetic.
- [ ] **Draft read-through for plain language (BR-DP-03).** Import each example in
  `docs/tabletop/examples/` into the intake page and read all three drafts aloud. Check they are
  concise, clear and plain, contain only facts from the record, and show `[NOT PROVIDED]` where a
  fact is missing. Note anything a Data Principal would not understand.
- [ ] **No silent interpretation.** For each AMB item listed at the end of a draft, confirm the
  draft or panel does not present an answer to it as settled.

## Intake page

- [ ] **DevTools network check.** Serve `dist/app/` (`npm run build`, `npm run preview`), open the
  browser DevTools Network tab with "Preserve log" on, use the page (fill, import, export, copy,
  download), and confirm every request is to the page's own origin (or a `blob:`/`data:` URL).
  Check Application → Storage shows no local storage, session storage, cookies or service worker.
- [ ] **Lighthouse accessibility check.** Run a Lighthouse accessibility audit on the served page
  and record the result and any issues. The README claims only keyboard navigation and labelled
  inputs; do not widen that claim without this check and a screen-reader test.
- [ ] **360px layout.** View the page at 360px width and confirm nothing is cut off or needs
  horizontal scrolling.

## Release and ownership

- [ ] **Employer IP terms.** Confirm the author's employment or contract terms allow publishing
  this work under Apache-2.0 under the author's name, and that no employer time, equipment or
  confidential information creates a claim.
- [ ] **LICENSE text.** Compare `LICENSE` with the Apache-2.0 text published by the Apache Software
  Foundation. It is the unmodified official text fetched from
  https://www.apache.org/licenses/LICENSE-2.0.txt (SHA-256
  `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`); the copyright holder is
  named in `NOTICE` and the README.
- [ ] **Placeholders.** Copyright holder, owner handle and repository URL are filled in. Replace the
  security contact placeholder in `SECURITY.md` before relying on it.
- [ ] **CI first run.** After the first push, confirm all CI jobs run. When the `network-check` job
  is green, remove its `continue-on-error: true` as its comment says.
- [ ] **Requirement findings.** Review the requirement findings recorded in the release report
  (Act s.2(i) and s.2(j), and the AMB-14 wording) and decide whether `docs/requirements.md` should
  change. Changes need maintainer approval.
- [ ] **Tabletop names.** Confirm the fictional organisation names in `docs/tabletop/` do not match
  real organisations you know of; rename any that do.
