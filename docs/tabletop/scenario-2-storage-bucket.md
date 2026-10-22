# Scenario 2 — Misconfigured storage bucket

> Fictional exercise. All organisations, systems and events are invented; any resemblance is
> coincidental. Draft aid, not legal advice: questions about the law are posed, not answered.

**Example record:** [examples/scenario-2-storage-bucket.json](examples/scenario-2-storage-bucket.json)
(snapshot at T+20h). Time T+0 is 3 Mar 2027, 11:15 IST, when an outside email reports the exposure.

## Background

*Plumvale Online Store (fictional)* sells household goods online. Order exports are written
nightly to a cloud storage bucket for an analytics job. During a migration three weeks ago an
access policy was changed and the bucket became publicly listable. The exports contain order
number, delivery address, phone number and items ordered. No payment card data is stored there.

## Injects

| Time | Inject |
|---|---|
| T+0 (3 Mar, 11:15) | A message to Plumvale's support inbox from someone who signs as an "independent researcher" says the bucket is open and lists two file names. |
| T+1h | Support forwards it to the engineering lead, who confirms the bucket is public and makes it private. |
| T+3h | Access logs show 214 list requests and 9 file downloads from outside addresses over 19 days. |
| T+6h | The 9 downloaded files are identified: about 46,000 order rows, about 27,800 distinct customers. |
| T+20h | Of these, 25,900 have a user account; the rest checked out as guests with a phone number only. |
| T+30h | The researcher asks whether Plumvale will "acknowledge" them publicly. |
| T+48h | No evidence of misuse found. The engineer who changed the policy has been identified; it was an error during migration. |
| T+72h | A configuration scan of all buckets is complete; one other bucket was public but held no personal data. |

## Decision points

1. Does Plumvale treat T+0 (the external report) or T+1h (internal confirmation) as becoming aware?
2. Do the 205 list requests without downloads change who counts as "affected"?
3. Is a materiality judgement being made anywhere? If so, by whom and on what basis?
4. How are guest customers (phone number only) intimated?
5. What goes in the "findings regarding the person who caused the breach": the outside downloader,
   the engineer, or both?

## Discussion prompts

- If the downloads were by the researcher only, does that change the facts you report, or only
  the likely impact?
- What does "extent" mean here: files, rows, customers, or days of exposure?
- What can customers usefully do to protect themselves when an address and phone number leak?
- How do you describe a configuration mistake to the Board without naming an individual?

## Obligations exercised

| ID | How the scenario exercises it |
|---|---|
| BR-GEN-02 | Accidental disclosure through a public bucket. |
| BR-DP-01 | Intimating each affected customer. |
| BR-DP-02 | Content limited to what Plumvale knows at the time. |
| BR-DP-05 | Describing nature, extent and timing of an exposure that lasted 19 days. |
| BR-DP-08 | Safety measures customers can take. |
| BR-BD-01 | Initial intimation, including "location of occurrence". |
| BR-BD-03 | Broad facts and reasons: a configuration change during migration. |
| BR-BD-05 | Findings about who caused it. |
| BR-BD-06 | Remedial measures: configuration scanning. |

## Ambiguities surfaced (questions, not answers)

| ID | Question for the team | Why this is unresolved |
|---|---|---|
| AMB-01 | Is awareness the external report or the internal confirmation an hour later? | "On becoming aware" is not defined. |
| AMB-04 | Are customers whose rows were listed but not downloaded "affected"? | "Affected" is not defined. |
| AMB-05 | Can Plumvale decide that a low-risk exposure needs no intimation? | Neither text states a risk or severity threshold. |
| AMB-07 | Is "location of occurrence" the cloud region, the bucket, or the company? | The meaning of "location" is not stated. |
| AMB-11 | Do findings need to address the outside downloader, the internal cause, or both? | The required depth of "findings regarding the person who caused the breach" is not stated. |
| AMB-06 | How are guest customers without an account reached if their phone number is wrong? | Rule 7(1) names no fallback channel. |

## Using the example record

Open the example file. Note that the Board's first-notice draft is complete but the full report
still has gaps. Try setting "Do you know who or what caused it?" to "Not known yet" and see how the
draft and its open legal questions change.
