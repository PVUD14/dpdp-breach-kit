# Scenario 4 — Lost unencrypted laptop

> Fictional exercise. All organisations, systems and events are invented; any resemblance is
> coincidental. Draft aid, not legal advice: questions about the law are posed, not answered.

**Example record:** [examples/scenario-4-lost-laptop.json](examples/scenario-4-lost-laptop.json)
(snapshot at T+6h). Time T+0 is 18 Aug 2027, 19:30 IST, when a teacher reports the loss.

## Background

*Ashgrove Learning Academy (fictional)* is a private school with about 900 students. A teacher
took a school laptop home to finish report cards. The laptop's disk was not encrypted. It held a
spreadsheet of students' names, classes, marks, and parents' phone numbers. Most students are
under 18.

## Injects

| Time | Inject |
|---|---|
| T+0 (18 Aug, 19:30) | The teacher calls the principal: the laptop was left in a shared auto-rickshaw about an hour ago. |
| T+1h | The principal informs the school's IT contractor. The laptop has no remote-wipe agent. |
| T+3h | The teacher's account passwords are reset. The spreadsheet covers classes 6 to 10: 412 students. |
| T+6h | The school confirms that parents' phone numbers are on file for 398 students; 14 have none. |
| T+24h | No contact from anyone who found the laptop. |
| T+48h | A parent asks on a class messaging group whether "the lost laptop had our children's data". |
| T+72h | The laptop has not been found. |

## Decision points

1. Is a lost device with no evidence of access a personal data breach? On what facts?
2. Who are the Data Principals to be intimated when the data is about children?
3. How does the school respond to the question on the parents' messaging group before formal
   intimation?
4. How does the school describe "extent" when it does not know whether the file was opened?
5. What does the school change: encryption, remote wipe, or what staff take home?

## Discussion prompts

- What is the difference between "could have been accessed" and "was accessed", and how do you
  say each plainly to a parent?
- Should the Data Principal draft be written for parents rather than students?
- What could the school tell the Board about "the person who caused the breach" here?

## Obligations exercised

| ID | How the scenario exercises it |
|---|---|
| BR-GEN-02 | Accidental loss of a device holding personal data. |
| BR-DP-01 | Intimating each affected Data Principal. |
| BR-DP-03 | Plain language for parents. |
| BR-DP-04 | Using registered contact details; 14 students have none. |
| BR-DP-05 | Describing an exposure whose extent is uncertain. |
| BR-BD-01 | Initial intimation. |
| BR-BD-05 | Findings when nobody acted maliciously. |
| BR-BD-06 | Remedial measures: disk encryption and remote wipe. |

## Ambiguities surfaced (questions, not answers)

| ID | Question for the team | Why this is unresolved |
|---|---|---|
| AMB-05 | Does a loss with no evidence of access still call for both intimations? | No risk or harm threshold is stated. |
| AMB-04 | Are all 412 students "affected", or only if the file is shown to be opened? | "Affected" is not defined. |
| AMB-06 | How are the 14 students with no registered contact intimated? | Rule 7(1) names no fallback channel. |
| AMB-11 | What counts as findings when the cause is a lost device? | The required depth of findings is not stated. |
| AMB-02 | How quickly is "without delay" when the school is closed overnight? | No maximum period is stated. |
| AMB-19 | For a student who is a child, who receives the intimation: the student, a parent or lawful guardian, or both? | The Act's definition of "Data Principal" includes the parents or lawful guardian of a child, but Rule 7(1) does not say how that applies to intimation or whose registered channel is meant. |

## Using the example record

Open the example file. "Is this a data breach?" says it can't tell yet, because "Could the data
have been seen by people who shouldn't see it?" is answered "Not sure yet". Discuss what fact
would change it.
