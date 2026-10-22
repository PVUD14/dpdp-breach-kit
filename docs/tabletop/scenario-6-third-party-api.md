# Scenario 6 — Third-party API leak

> Fictional exercise. All organisations, systems and events are invented; any resemblance is
> coincidental. Draft aid, not legal advice: questions about the law are posed, not answered.

**Example record:** [examples/scenario-6-third-party-api.json](examples/scenario-6-third-party-api.json)
(snapshot at T+48h, after a written request for a longer period). Time T+0 is 9 Feb 2028,
16:00 IST, when the partner's notice arrives.

## Background

*Mintleaf Pay Wallet (fictional)* runs a payments wallet. It shares customer identifiers and
transaction summaries with *Quillstone Rewards (fictional)*, which runs a cashback programme.
Each company decides how it uses the data for its own purposes. Quillstone exposed an API
endpoint without authentication, and records sent by Mintleaf could be queried by anyone who
knew the URL pattern.

## Injects

| Time | Inject |
|---|---|
| T+0 (9 Feb, 16:00) | Quillstone emails Mintleaf: "an API issue may have exposed some partner data". No numbers. |
| T+4h | Mintleaf asks for logs. Quillstone says its own investigation is under way. |
| T+20h | Quillstone shares a summary: the endpoint was open for about 11 days; about 52,000 Mintleaf customer records could be queried. |
| T+30h | Mintleaf cannot see Quillstone's access logs and cannot tell which records were actually queried. |
| T+40h | Mintleaf sends a written request to the Board for a longer period for the detailed report, citing missing partner logs. |
| T+48h | No reply from the Board yet. Quillstone says it is intimating "its" customers. |
| T+72h | Quillstone's logs arrive: 6,300 Mintleaf records were queried from outside addresses. |

## Decision points

1. Is Quillstone Mintleaf's Data Processor, an independent Data Fiduciary, or both for different
   purposes? Who decides, and on which documents?
2. Who intimates the customers, and do they receive two notices about one breach?
3. Is Mintleaf "aware" at T+0 with no numbers, or at T+20h?
4. While the request for a longer period is pending, which deadline does Mintleaf work to?
5. Who are the "affected" customers: 52,000 that could be queried, or 6,300 that were?

## Discussion prompts

- What does the data-sharing agreement say about breach notice, logs and cooperation?
- How do two companies coordinate notices so customers are not confused?
- What can Mintleaf say about "location of occurrence" for a system it does not run?
- What would you have needed from the partner at T+0 to act faster?

## Obligations exercised

| ID | How the scenario exercises it |
|---|---|
| BR-GEN-01 | If the partner were a Data Processor, the duty stays with the Data Fiduciary. |
| BR-GEN-02 | Accidental disclosure through an unauthenticated API. |
| BR-DP-01 | Intimating each affected customer. |
| BR-DP-02 | Content limited to what Mintleaf knows from the partner. |
| BR-BD-01 | Initial intimation with partner-supplied facts. |
| BR-BD-02 | Detailed report depending on another company's logs. |
| BR-BD-08 | A written request for a longer period. |

## Ambiguities surfaced (questions, not answers)

| ID | Question for the team | Why this is unresolved |
|---|---|---|
| AMB-13 | If Quillstone is a processor, does its earlier awareness start Mintleaf's clock? | Whether a processor's awareness counts as the fiduciary's is not stated. |
| AMB-01 | Is a vague partner email "becoming aware"? | "On becoming aware" is not defined. |
| AMB-04 | Are records that could be queried "affected", or only those that were? | "Affected" is not defined. |
| AMB-07 | Is "location of occurrence" the partner's API, its hosting region, or the partner itself? | The meaning of "location" is not stated. |
| AMB-12 | What deadline applies while the written request for a longer period is pending? | The position while a request is pending is not stated. |
| AMB-03 | If only 6,300 are known at T+72h but 52,000 were exposed, who is notified first? | "To the best of its knowledge" does not say how later-identified principals are handled. |
| AMB-20 | If Mintleaf and Quillstone each determine purposes and means, which of them intimates customers and the Board, and how are duplicate notices avoided? | The Act lets a Data Fiduciary act "in conjunction with other persons", but Rule 7 does not say how the duty applies to more than one fiduciary. |

## Using the example record

Open the example file and choose when to start the 72-hour clock. The deadline panel shows extra
time as "Asked for — no reply yet" and keeps the 72-hour deadline, with AMB-12 among the open legal
questions. The page does not decide what the pending request means.
