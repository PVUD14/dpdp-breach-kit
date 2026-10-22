# Scenario 3 — Insider exfiltration

> Fictional exercise. All organisations, systems and events are invented; any resemblance is
> coincidental. Draft aid, not legal advice: questions about the law are posed, not answered.

**Example record:** [examples/scenario-3-insider-exfiltration.json](examples/scenario-3-insider-exfiltration.json)
(snapshot at T+50h). Time T+0 is 7 Jun 2027, 10:05 IST, when a data-loss alert is reviewed.

## Background

*Corventa Finance Advisory (fictional)* advises households on loans and insurance. A relationship
manager who resigned last week had legitimate access to client files. Their system access ends on
their last working day, three days from T+0. The client files contain income band, loan amounts
and family details.

## Injects

| Time | Inject |
|---|---|
| T+0 (7 Jun, 10:05) | A data-loss alert from four days ago is reviewed: a large export from the client system to a personal cloud folder. |
| T+2h | IT confirms the export: about 3,400 client files. The employee still has access. |
| T+3h | Access is suspended. HR and the legal contact are informed. |
| T+8h | The employee says the export was "to finish work from home" and offers to delete it. |
| T+24h | Corventa cannot confirm deletion. The personal cloud folder is outside its control. |
| T+50h | A former client calls: a competing firm contacted them using details only Corventa held. |
| T+72h | Corventa is considering a police complaint. No court or police process has started. |

## Decision points

1. Is an authorised user exporting data they could see "unauthorised processing"? Who decides?
2. Does the data-loss alert four days earlier count as becoming aware, or the review at T+0?
3. Is a confidentiality compromise established before the T+50h call?
4. If Corventa files a police complaint, does it consider an exemption? Who would assess that?
5. How much does the detailed report say about the employee, and how?

## Discussion prompts

- What does your offboarding process do between resignation and last working day?
- Who reviews data-loss alerts, and how quickly? What did the four-day gap cost?
- How do you describe "the person who caused the breach" without exposing more personal data?
- What is the difference between what you believe and what you can state as fact at T+24h?

## Obligations exercised

| ID | How the scenario exercises it |
|---|---|
| BR-GEN-02 | Possible unauthorised processing by an insider. |
| BR-GEN-03 | A possible exemption claim if a criminal process starts. |
| BR-DP-01 | Intimating affected clients. |
| BR-DP-06 | Consequences such as being contacted by a competitor. |
| BR-BD-01 | Initial intimation. |
| BR-BD-03 | Events and circumstances: resignation, export, alert review delay. |
| BR-BD-05 | Findings regarding the person who caused the breach. |
| BR-BD-06 | Remedial measures: offboarding and alert review. |

## Ambiguities surfaced (questions, not answers)

| ID | Question for the team | Why this is unresolved |
|---|---|---|
| AMB-17 | If the export is "unauthorised processing" but compromise is not yet shown, is it a breach? | It is unclear whether the "compromises" clause in s.2(u) qualifies unauthorised processing. |
| AMB-01 | Is awareness the unreviewed alert four days ago or the review at T+0? | "On becoming aware" is not defined. |
| AMB-15 | Would a police complaint bring the processing within an exemption, and who decides? | Applying s.17(1) needs case-by-case legal determination. |
| AMB-11 | How much must be said about the employee in the findings? | The required depth of findings is not stated. |
| AMB-03 | If more clients are identified after the first notices, are they intimated too? | "To the best of its knowledge" does not say. |

## Using the example record

Open the example file. "Is this a data breach?" says a lawyer must decide, because a legal
exemption is noted. Remove the exemption and see how the result changes. Neither result is a legal
conclusion.
