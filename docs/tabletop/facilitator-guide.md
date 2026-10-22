# Rule 7 tabletop exercises — facilitator guide

> **Draft aid — not legal advice.** These exercises rehearse how a team gathers facts and drafts
> intimations under Rule 7 of the DPDP Rules, 2025. They do not say what the law requires in any
> real case. Where the text is ambiguous, the scenarios ask the question; they never answer it.
> All organisations, systems, people and events in this pack are **fictional**; any resemblance
> to a real organisation or incident is coincidental. Use no real personal data in an exercise.

## Purpose

- Practise turning a messy, unfolding incident into the facts Rule 7 asks for.
- Practise producing the three drafts (Data Principal notice, Board initial, Board detailed) with
  the intake page, and seeing what is still `[NOT PROVIDED]`.
- Surface the points where the text is ambiguous (`AMB-xx` in
  [../requirements.md](../requirements.md) §5) **before** a real incident, and record who in your
  organisation would decide them and on what advice.

It is **not** a test, an audit or a compliance assessment. There is no score.

## Audience

Small and medium enterprises, security leads, privacy and legal contacts, and the consultants who
support them. No prior knowledge of the DPDP Act is assumed; one participant should have read
[../requirements.md](../requirements.md) §4–§5 beforehand.

## Roles

| Role | Does |
|---|---|
| Facilitator | Runs the clock, reads injects, asks the prompts, keeps the discussion on facts and decisions. Does not give legal conclusions. |
| Incident lead | Owns the incident record in the intake page and decides what is entered. |
| Technical lead | Answers "what do we actually know" questions; says when a fact is unknown. |
| Privacy / legal contact | Identifies which AMB items need advice and who would give it. Records questions, not answers. |
| Communications lead | Reviews the Data Principal draft for plain language (BR-DP-03). |
| Scribe | Records decisions, open questions and the time each fact became known. |

In a small team one person may hold several roles. The facilitator should not also be the
incident lead.

## Time boxes

Each scenario fits in **60–90 minutes**.

| Segment | Minutes | Notes |
|---|---|---|
| Setup and ground rules | 5–10 | Roles, "no real data", how the clock works. |
| Injects T+0 to T+24h | 20–30 | Read each inject; pause for the decision points. |
| Injects T+24h to T+72h | 15–25 | Drafts should exist by now; review them. |
| Draft review | 10–15 | Read the three drafts aloud; check placeholders and the AMB list. |
| Debrief | 10 | Use the questions below. |

Exercise time is compressed: T+72h is a label, not 72 real hours. The intake page's panels always
measure against the real current time, and the scenario dates are in the future, so "time
remaining" figures will not match the exercise clock. Use the **effective deadline** the page shows
and compare it with the scenario's timeline; the scribe keeps the exercise clock.

## Running it with the intake page

1. Open the hosted page at <https://pvud14.github.io/dpdp-breach-kit/>, or build and serve your own
   copy (see [DEVELOPERS.md](../DEVELOPERS.md): `npm run build`, then `npm run preview`). It must be
   served over HTTP(S); it makes no network requests and stores nothing.
2. Either start from an empty form, or click **Open a saved file…** and choose the scenario's
   example file from [examples/](examples/). Each example is a snapshot part-way through its
   scenario.
3. As injects arrive, the incident lead updates the form. Unknown facts stay empty, so they appear
   as `[NOT PROVIDED]` in the drafts. Do not guess to fill a gap.
4. In **Start the 72-hour clock from**, the team must choose whose "finding out" starts the clock.
   The page has no default (AMB-01, AMB-13). Record why the team chose that option.
5. Watch the results: "Is this a data breach?", the 72-hour deadline, time since you found out,
   and when the rules start. When facts are missing or the law is unclear, the page says it
   "can't tell yet" or that a lawyer must decide, rather than deciding.
6. Open each draft tab. Read the **Open legal questions for this draft** list and the review
   checklist at the end of each draft.
7. At the end, click **Save to file** if you want to keep the record. Nothing is kept otherwise.

The scenario timestamps are in IST (+05:30). The page enters and shows IST.

## Facilitator rules

- Ask; do not answer. When the team asks "do we have to…?", turn it back: "What does the text
  say, what is unclear, and who would you ask?"
- Every AMB item a scenario surfaces is posed as a question. Do not resolve it in the room.
- Keep facts and assumptions separate. If the team assumes, the scribe writes "assumed".
- Stop anyone entering real names, contact details or identifiers, even as a joke.

## Debrief questions (no scoring)

1. Which facts did we not have when the drafts were first needed? How would we get them faster?
2. When did we decide we had "become aware"? Who made that call, and on what basis?
3. Which AMB items did we hit? For each, who in our organisation would decide, and on whose advice?
4. Did anyone try to fill a `[NOT PROVIDED]` gap with a guess? What stopped us, or should have?
5. Was the Data Principal draft concise, clear and plain? Who outside the team could check it?
6. What do our contracts with processors say about telling us about a breach, and how fast?
7. What would we do differently in the first hour next time?
8. What is the one change we will make before the next exercise, and who owns it?

## Scenario index

| # | Scenario | Example record |
|---|---|---|
| 1 | [Ransomware at a data processor](scenario-1-processor-ransomware.md) | [examples/scenario-1-processor-ransomware.json](examples/scenario-1-processor-ransomware.json) |
| 2 | [Misconfigured storage bucket](scenario-2-storage-bucket.md) | [examples/scenario-2-storage-bucket.json](examples/scenario-2-storage-bucket.json) |
| 3 | [Insider exfiltration](scenario-3-insider-exfiltration.md) | [examples/scenario-3-insider-exfiltration.json](examples/scenario-3-insider-exfiltration.json) |
| 4 | [Lost unencrypted laptop](scenario-4-lost-laptop.md) | [examples/scenario-4-lost-laptop.json](examples/scenario-4-lost-laptop.json) |
| 5 | [Phishing leading to account takeover](scenario-5-phishing-account-takeover.md) | [examples/scenario-5-phishing-account-takeover.json](examples/scenario-5-phishing-account-takeover.json) |
| 6 | [Third-party API leak](scenario-6-third-party-api.md) | [examples/scenario-6-third-party-api.json](examples/scenario-6-third-party-api.json) |
