# Scenario 1 — Ransomware at a data processor

> Fictional exercise. All organisations, systems and events are invented; any resemblance is
> coincidental. Draft aid, not legal advice: questions about the law are posed, not answered.

**Example record:** [examples/scenario-1-processor-ransomware.json](examples/scenario-1-processor-ransomware.json)
(snapshot at T+30h). Time T+0 is 14 Jan 2027, 22:40 IST, when the processor first detects
encryption activity.

## Background

*Tarvelo Health Clinics (fictional)* runs twelve outpatient clinics. Appointment booking and
patient reminders are hosted by *Brightquay Cloud Services (fictional)*, a Data Processor under a
written contract. The contract asks Brightquay to "notify promptly" of security incidents but sets
no hours. Brightquay's environment holds appointment records: name, phone number, clinic,
appointment date and a free-text reason for visit. In the exercise none of these values exist;
the record holds counts only.

## Injects

| Time | Inject |
|---|---|
| T+0 (14 Jan, 22:40) | Brightquay's monitoring flags mass file renames on the booking database host. Brightquay's on-call engineer starts their own incident process. Tarvelo is not told. |
| T+2h | Brightquay isolates the host. Bookings stop working for all Tarvelo clinics. |
| T+9h (15 Jan, 07:40) | Tarvelo's front-desk staff report that bookings fail. Tarvelo's IT contact raises a ticket with Brightquay. |
| T+10h (08:40) | Brightquay's account manager calls Tarvelo: "a security incident affecting availability". A ransom note was found. Brightquay does not yet know whether data was copied out. |
| T+14h | Brightquay restores bookings from a backup that is 20 hours old. Some recent appointments are missing. |
| T+24h | Brightquay's forensic firm finds outbound transfers of about 4 GB from the host before encryption. Contents not yet confirmed. |
| T+30h | Brightquay confirms the transfer included an export of appointment records: about 38,000 records, about 31,500 distinct patients. About 2,100 have no phone number or email on file. |
| T+48h | A message on a leak site claims to hold "Tarvelo patient data". No sample is published. |
| T+72h | The forensic report is still in draft. The attacker's identity is unknown. |

## Decision points

1. At T+10h: does Tarvelo open its own incident record, and what does it enter as the time it
   became aware?
2. At T+10h: is this a personal data breach while only availability is known to be affected?
3. At T+24h–T+30h: when does Tarvelo send the initial intimation to the Board, and with which
   facts still `[NOT PROVIDED]`?
4. Which time does the team choose in the page's **Start the 72-hour clock from**, and why?
5. Does Tarvelo ask the Board for a longer period for the detailed report? When, and on what basis?
6. How are the 2,100 patients with no registered channel handled?

## Discussion prompts

- What does Tarvelo's contract with Brightquay say about timing and content of incident notices?
  What should it say?
- Who at Tarvelo can decide on intimation at 08:40 on a weekday? Who at 22:40?
- What would "the consequences relevant to her" look like for a patient whose reason for visit
  was exposed, versus one whose appointment was only delayed?
- What can Tarvelo honestly say about "the person who caused the breach" at T+72h?
- The leak-site claim is unverified. Does it change what goes in the drafts?

## Obligations exercised

| ID | How the scenario exercises it |
|---|---|
| BR-GEN-01 | The breach happened at a Data Processor; Tarvelo remains the Data Fiduciary. |
| BR-GEN-02 | Availability was compromised first; confidentiality only became known later. |
| BR-DP-01 | Intimating each affected patient once they are identified. |
| BR-DP-04 | Patients with no user account or registered contact. |
| BR-DP-06 | Consequences differ between patients. |
| BR-BD-01 | Initial intimation while key facts are unknown. |
| BR-BD-02 | Detailed report at 72 hours with a draft forensic report. |
| BR-BD-05 | Findings about the attacker are unknown. |
| BR-BD-07 | Reporting on patient intimations that are still in progress. |
| BR-BD-08 | A possible written request for a longer period. |

## Ambiguities surfaced (questions, not answers)

| ID | Question for the team | Why this is unresolved |
|---|---|---|
| AMB-13 | Does the clock start when Brightquay became aware (T+0) or when Tarvelo did (T+10h)? | Rule 7 binds only the Data Fiduciary and does not say whether a processor's awareness counts as its awareness. |
| AMB-01 | Is Tarvelo "aware" at the T+10h call, or only at T+30h when personal data is confirmed? | "On becoming aware" is not defined. |
| AMB-17 | Before exfiltration is known, is an availability-only event a "personal data breach"? | The scope of the "compromises … availability" clause in s.2(u) is unclear. |
| AMB-06 | How are patients with no registered channel to be intimated? | Rule 7(1) names no fallback channel. |
| AMB-11 | Does "no findings yet" about the attacker satisfy the detailed report? | The required depth of "any findings regarding the person who caused the breach" is not stated. |
| AMB-12 | When must a request for a longer period be made, and what applies while it is pending? | The text gives no deadline, format or response time for the request. |
| AMB-10 | What should the 72-hour report say if patient intimation is incomplete? | Rule 7(1) says "without delay" while the report is due within 72 hours. |

## Using the example record

Open the example file in the intake page (**Open a saved file…**). In **Start the 72-hour clock
from**, try "When your vendor found out" and then "When your organisation found out", and compare
the deadlines. Note which draft sections show `[NOT PROVIDED]` at T+30h.
