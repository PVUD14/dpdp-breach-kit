# Response workspace implementation

Implemented locally on 24 October 2026 for version 0.2.0. This extends the existing draft aid;
it does not establish the legal accuracy or current applicability of the underlying rules.

Public-release preparation: the transparent logo and downloadable visual SOP are packaged as
local assets. Current release checks cover 152 unit tests and 52 browser checks at both the
root and `/dpdp-breach-kit/` prefix, including image loading and PDF downloads. See
PUBLIC-RELEASE.md for deployment gating and remaining human review.

## Workflow

The beginner redesign separates two workspaces. The default starts with everyday incident
choices, asks one question at a time, and allows “I don't know yet” throughout. It asks for no
incident identifier, legal classification or clock-basis decision. Unknown answers remain
unknown; choosing an incident description does not automatically classify it legally.
Users can save a partial record during the interview and reopen it later.

After the interview, “Your next steps” shows three practical prompts, who can help with each,
and a plain-language summary to download for internal review. The user can return to their
answers. “For your reviewer” deliberately reveals the full record, legal timing assumptions,
draft notices, action register and remaining questions. Importing a file into a fresh session
opens the beginner summary; users can choose the reviewer view when needed.

The visual design uses a quieter green-and-neutral palette, larger question headings, selectable
incident cards, a six-step progress indicator and fewer simultaneously visible controls.
The first suggested action adapts to the selected situation (missing device, misdirected
information, suspicious access or unavailable files), without changing the legal classification.

Redesign verification: 149 unit tests and 50 browser checks passed, including the all-unknown
path, saving during the interview, summary download and explicit reviewer-view switching.
Invalid answers keep the current session and correction controls visible. Switching to the
beginner view with an invalid detailed record provides a recovery action instead of an empty
screen. Explicit reset clears both the session and its unsaved-changes warning. Browser tests
cover these recovery paths and focus transfer to the validation errors.
Lighthouse snapshots cover six states including the beginner summary. Audit reports and screen
captures are written to `artifacts/accessibility/`, outside the production build output so a
rebuild does not erase the review evidence. These checks do not substitute for novice-user or
screen-reader testing.

Start a new incident, import a saved JSON record, or choose one of six fictional exercises.
The six-step interview records the incident, awareness times, data categories, affected count,
containment status and measures taken. Unknown answers remain missing. Users may open the
full form at any point. The response overview shows preparation status, missing facts linked
to fields, contradictions, response actions, and review questions. The existing deadline engine
requires an explicit clock basis; the response record also captures why that basis was chosen.

The response pack is a single plain-text download containing the internal summary, assumptions,
all three draft notices, missing-information checklist, response actions, activity/evidence
references, and reviewer notes. The JSON backup is the editable record for reopening.
Browser download initiation is reported as an export request; the user must confirm their file
was actually saved. Closing a tab with unexported changes prompts through the browser.

## Versioning and privacy

`src/core/incident.schema.json` remains the legacy version 1 schema.
`src/core/incident.v2.schema.json` describes version 2 including its required response object.
`response.schema.json` documents that sub-object separately. Validation rejects unknown fields
at every level and accepts real offset-bearing timestamps. The browser upgrades a version 1
file in memory with explicit notice, leaving the original file unchanged. Version 2 preserves
clock choices, actions, review notes, and practice progress across form/file round trips.

The new fields record encryption, intended notice languages, counts of children and persons
with disability, intended guardian recipients, multiple-fiduciary involvement, and an exemption
assessment reference. Text fields cannot prevent people typing personal data; the warning still
applies. Nothing is sent to a remote service or persisted in browser storage. All six scenario
texts are included in the local build, so exercises need no network request.

Activity history and reviews are editable, self-reported records, not authenticated approvals
or tamper-proof evidence. Ordinary answer edits, task changes, and clock-choice changes clear
the review timestamp. A later review requires a role and notes. Roles should not contain names.

## Ambiguity design

AMB-19 is triggered by a positive affected-child or disability count, or a recorded recipient
plan. Each generated draft flags recipient/channel questions without choosing recipients.
AMB-20 is triggered by recorded joint fiduciaries. Each draft flags coordination and duplicate
notice questions without assigning legal responsibility. These implement the existing documented
ambiguities; they do not introduce a new legal interpretation. Encryption does not change the
breach checklist, and an exemption assessment reference does not resolve the exemption claim.

## Practice

Each existing scenario's actual inject sequence is revealed one update at a time, through T+72h.
The exercise clock advances relative to the start time; source-document dates remain background
references. No later facts are inserted into answers automatically. Practice is clearly labelled
in the UI and all generated drafts, and the pack adds a debrief of missing facts and actions.
Saved exercise files preserve the selected scenario, current inject and clock origin.

## Verification and remaining review

Unit coverage includes legacy/version 2 validation, malformed imports, response-state round trips,
contradictions, ambiguity propagation, all six exercise timelines, and response-pack content.
The local browser suite exercises the interview, task creation, review invalidation, download,
import, practice progression, keyboard draft navigation, labels, narrow layout and privacy guards.

Before the beginner redesign, verification on 24 October 2026 recorded 146 unit tests and 40 local Chrome browser checks;
strict TypeScript checks and both production builds passed. Lighthouse 12.8.2 snapshot audits
scored 100/100 with no failing automated checks in five states: start, guided interview, full
response, practice, and 360px mobile dark mode. Current reports are generated under `artifacts/accessibility/`.
The browser suite verified keyboard reachability for every visible control in the exercised
workspace, draft-tab arrow keys, and that timer panels are not live regions.
Follow-up checks also verify focus transfer from the interview to the full form and overview,
focus on newly revealed exercise content, and status announcements for adding actions and
requesting a response-pack download. The guided form is labelled by its visible step heading.

Reproduce the optional accessibility audit with `scripts/audit-accessibility.mjs`, supplying a
development node_modules directory containing Lighthouse and puppeteer-core, the local preview
URL, and the Chrome binary. These tools are not application dependencies. The script audits
real rendered states without changing the app's privacy policy or Content-Security-Policy.

Full screen-reader testing (desktop and mobile), legal review and the existing human verification
checklist remain unverified. Automated scores do not establish those outcomes. No deployment
has been performed. The active implementation goal remains open for the screen-reader work.

## Remaining screen-reader walkthrough

Use NVDA with Chrome on Windows and VoiceOver or TalkBack on a mobile device. Record device,
browser, screen-reader version, tester and date. Start a fictional incident and cover the following:

1. Read the start options, navigate all six interview steps, and return to an earlier answer.
2. Enter an invalid count and follow the announced error; correct it and complete the interview.
3. Follow a missing-fact link, choose a clock basis, and check that one-second timer changes do
   not interrupt speech. Confirm that the explanation and selected basis are readable.
4. Add and complete an action, record review notes, edit an answer, and confirm review is pending.
5. Navigate draft tabs with arrow keys and read the selected draft and its uncertainty notes.
6. Copy/download/export, reopen the file, and check that success/failure statuses are announced.
7. Start a fictional exercise, reveal an update, reopen a saved exercise, and read the debrief.

Any failure should be recorded with its exact action, observed announcement, expected behaviour,
and a reproducible fictional file. No manual screen-reader result has been claimed or signed off.

Environment check: this session exposes no desktop screen-reader or mobile-device control tool.
No NVDA/JAWS installation was found in the standard Program Files directories and no Android
device bridge was found on PATH. This does not prove no device exists; it means the required
desktop/mobile screen-reader walkthrough cannot be verified with the currently exposed tools.
Results from a tester or access to an appropriate test setup are needed to close this gate.
