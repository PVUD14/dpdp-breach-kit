# Scenario 5 — Phishing leading to account takeover

> Fictional exercise. All organisations, systems and events are invented; any resemblance is
> coincidental. Draft aid, not legal advice: questions about the law are posed, not answered.

**Example record:** [examples/scenario-5-phishing-account-takeover.json](examples/scenario-5-phishing-account-takeover.json)
(snapshot at T+70h). Time T+0 is 2 Nov 2027, 09:20 IST, when a support agent reports a
suspicious login.

## Background

*Zephyrine Travel Desk (fictional)* books domestic travel for small businesses. A support agent
entered their credentials on a fake sign-in page. The attacker used the agent's session to view
customer profiles and change the registered email address on some customer accounts, then reset
those accounts' passwords.

## Injects

| Time | Inject |
|---|---|
| T+0 (2 Nov, 09:20) | The agent reports that they "logged in twice" and their session was ended. Security finds a login from an unfamiliar network. |
| T+2h | The agent's account is disabled. The audit log shows 1,180 customer profiles viewed in 40 minutes. |
| T+5h | On 260 of those accounts, the registered email was changed to attacker-controlled addresses. |
| T+12h | Zephyrine restores the original emails from backup records and locks the 260 accounts. |
| T+26h | Customers start calling: they received booking-change emails they did not request. |
| T+40h | Zephyrine sends the initial intimation to the Board. |
| T+52h | Customer intimations are sent to 920 of the 1,180 customers through their user accounts. |
| T+70h | The remaining 260 customers can be reached only by phone; calls are under way. |
| T+72h | The detailed report is being finalised. |

## Decision points

1. For the 260 customers whose registered email was changed, which channel is "registered by her"?
2. Is the detailed report sent at T+72h, or is a longer period requested? When?
3. What does the detailed report say about intimations still in progress?
4. Is the attacker "the person who caused the breach", or the gap in the sign-in process, or both?
5. When the team chooses a clock basis at T+0, what is it choosing between?

## Discussion prompts

- How would a customer tell a genuine breach notice from another phishing message?
- What safety measures can a customer actually take after an account takeover?
- What should the 72-hour report say if it is ready at 71:59, or at 72:00 exactly?

## Obligations exercised

| ID | How the scenario exercises it |
|---|---|
| BR-GEN-02 | Unauthorised processing through a hijacked staff session; integrity compromised (email changes). |
| BR-DP-01 | Intimating each affected customer. |
| BR-DP-04 | The registered channel itself was compromised for some customers. |
| BR-DP-08 | Safety measures after an account takeover. |
| BR-DP-09 | A business contact customers can verify. |
| BR-BD-02 | Detailed report at the 72-hour boundary. |
| BR-BD-07 | Report on intimations while 260 are still in progress. |
| BR-BD-08 | Whether to request a longer period. |

## Ambiguities surfaced (questions, not answers)

| ID | Question for the team | Why this is unresolved |
|---|---|---|
| AMB-06 | Which channel counts when the registered email was changed by the attacker? | Rule 7(1) does not address a compromised registered channel. |
| AMB-10 | What does the 72-hour report say when 260 intimations are still in progress? | The text does not say what to report if intimation is incomplete at 72 hours. |
| AMB-18 | Is a report sent at exactly 72:00:00 within the period? | Whether the end-point is inclusive is not stated. |
| AMB-09 | Is an update expected after the detailed report as calls continue? | No obligation to update after the 72-hour report is stated. |
| AMB-12 | If a longer period is requested at T+70h, what applies until the Board replies? | The position while a request is pending is not stated. |

## Using the example record

Open the example file and choose when to start the 72-hour clock. The page measures against the
real current time, so compare its deadline (5 Nov 2027, 09:20 IST when counted from when your
organisation found out) with the scenario clock rather than reading "time left". The record's
notices show what had been sent by T+70h. Look at the "Report on intimations" section of the full
report draft.
