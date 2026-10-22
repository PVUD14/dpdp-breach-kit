# Requirements: Personal Data Breach Intimation (DPDP Rules, 2025 — Rule 7)

Scope: obligations under Rule 7 of the Digital Personal Data Protection Rules, 2025, and the provisions of
the Digital Personal Data Protection Act, 2023 that Rule 7 depends on. Taken only from the official texts
listed in §1. No secondary summaries were used as a source of requirements.

Prepared: 2026-10-22 (IST). Status: draft for review — not legal advice.
Revised: 2026-10-22 (IST) — added AMB-17 and AMB-18 (§5), found while implementing `src/core`; added
AMB-19 and AMB-20 (§5), found while writing the tabletop scenarios; updated AMB-14 to say where the
computed commencement date appears.

---

## 1. Sources

All files are stored in `docs/source/`. Download dates/times are IST (UTC+05:30).

| File | Document | Identifier printed on the document | Source URL | Downloaded (IST) | Pages | SHA-256 |
|---|---|---|---|---|---|---|
| `dpdp_rules_2025.pdf` | Digital Personal Data Protection Rules, 2025 (Hindi pp. 1–23, English pp. 24–41) | G.S.R. 846(E), MeitY Notification, New Delhi, 13th November, 2025; Gazette of India, Extraordinary, Part II—Section 3—Sub-section (i), No. 760, 13 Nov 2025; F. No. AA-11038/1/2025-CLandES | https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf | 2026-10-22 12:13 | 41 | `eabc7d05e013144615d78ddc0e8b9c9aac1920e814f4fad38ce6560951f5aa08` |
| `dpdp_rules_2025_corrigendum.pdf` | Corrigendum to G.S.R. 846(E) | G.S.R. 892(E), New Delhi, 10th December, 2025; Gazette of India, Extraordinary, No. 806, 11 Dec 2025; F. No. AA-11038/8/2025-CL&ES | https://www.meity.gov.in/static/uploads/2025/12/3c7ebbae0e5456f493f486e6845df86b.pdf | 2026-10-22 12:17 | 1 | `8f8d9526b511801889f8ae022b6d7c5db449283e90fe32792e5896314b32f994` |
| `dpdp_act_2023.pdf` | Digital Personal Data Protection Act, 2023 (No. 22 of 2023), as published | Gazette of India, Extraordinary, Part II—Section 1, No. 25, 11 Aug 2023; Act No. 22 of 2023, [11th August, 2023] | https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf | 2026-10-22 12:15 | 21 | `4deb23981d3010c8225a2ff6149e7243dc2268455b299e283afebdd7b72a7d15` |
| `dpdp_act_commencement_gsr843.pdf` | Notification appointing commencement dates for Act provisions | G.S.R. 843(E), New Delhi, 13th November, 2025; Gazette of India, Extraordinary, No. 757, 13 Nov 2025; F. No. AA-11038/1/2025-CL&ES | https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf | 2026-10-22 12:18 | 2 | `6df25cd8c76ac8eb18cae81835d51d51128ffbf2ed13262843395efddf0998e5` |

Verification of the Rules PDF: the downloaded file is the Gazette of India, Extraordinary. Its English
preamble (printed p. 24) states the rules are made under "sub-sections (1) and (2) of section 40" of the Act
after the draft G.S.R. 02(E) of 3 Jan 2025. That confirms it is the **notified** Rules, not the draft.

Language note: the Gazette has both Hindi and English texts. Rule 7 appears in Hindi on printed p. 4 and in
English on printed p. 26. This document uses the English text only.

---

## 2. Commencement (as stated in the texts — not computed)

| Item | Text | Citation |
|---|---|---|
| Rule 7 | Rule 7 falls within "Rules 3, 5 to 16, 22 and 23", which "shall come into force eighteen months after the date of publication" — as corrected by G.S.R. 892(E), "in the Official Gazette" (original wording: "of this Gazette"). | Rules r. 1(4); Corrigendum G.S.R. 892(E) item (i)(b) |
| Rules publication date printed on the Gazette | "New Delhi, the 13th November, 2025"; Gazette No. 760 dated 13 Nov 2025. | Rules, printed pp. 1, 24 |
| Act s.2 (definitions, incl. s.2(u)) and s.40 (rule-making) | In force on "the date of publication of this notification in the Official Gazette". | G.S.R. 843(E) cl. (a) |
| Act s.8 (incl. s.8(6)) | "sections 7 to 10" come into force "eighteen months from the date of publication of this gazette". | G.S.R. 843(E) cl. (c) |
| Act s.27(1)(a), s.33 (penalties) | Also in cl. (c) — eighteen months ("section 27 except clause (d) of sub-section (1)", "sections 28 to 34"). | G.S.R. 843(E) cl. (c) |

No calendar date for the commencement of Rule 7 is printed in the Rules. The commencement is expressed only
relative to the date of publication. A calendar date has deliberately **not** been computed here — see
AMB-14.

---

## 3. Act provisions Rule 7 depends on

| Ref | Provision | Short extract | Relevance |
|---|---|---|---|
| Act s.2(u) | Definition of "personal data breach" | "any unauthorised processing of personal data or accidental disclosure, acquisition, sharing, use, alteration, destruction or loss of access to personal data", that "compromises the confidentiality, integrity or availability" | Defines the trigger event for Rule 7. Rules r. 2(2) imports Act definitions. |
| Act s.2(t) | Definition of "personal data" | "any data about an individual who is identifiable by or in relation to such data" | Scope of data covered. |
| Act s.8(1) | Fiduciary responsibility | Fiduciary is responsible "in respect of any processing undertaken by it or on its behalf by a Data Processor" | Breaches at a Data Processor remain the Fiduciary's obligation. |
| Act s.8(5) | Security safeguards | "reasonable security safeguards to prevent personal data breach" | Related duty (implemented by Rules r. 6), not part of Rule 7. |
| Act s.8(6) | **Breach intimation duty** | "In the event of a personal data breach", the Data Fiduciary "shall give the Board and each affected Data Principal, intimation of such breach in such form and manner as may be prescribed" | Parent duty that Rule 7 prescribes. |
| Act s.40(2)(f) | Rule-making power | "the form and manner of intimation of personal data breach to the Board under sub-section (6) of section 8" | Basis for Rule 7(2). |
| Act s.27(1)(a) | Board powers on intimation | On receipt of an intimation, the Board may "direct any urgent remedial or mitigation measures", "inquire into such personal data breach and impose penalty" | Consequence of intimation. |
| Rules r. 19(9) | Board inquiry period | Inquiry "completed within a period of six months from the date of receipt of the intimation … under section 27", extendable | Board-side timeline after intimation. |
| Act s.33(1) + Schedule item 2 | Penalty | Breach of "the obligation to give the Board or affected Data Principal notice of a personal data breach under sub-section (6) of section 8": "May extend to two hundred crore rupees" | Penalty for non-compliance. See AMB-16. |
| Act s.17(1) | Exemptions | "The provisions of Chapter II, except sub-sections (1) and (5) of section 8" do not apply in the listed cases (a)–(f) | s.8(6) is in Chapter II and is **not** among the retained sub-sections, so breach intimation does not apply where s.17(1) applies. See AMB-15. |

---

## 4. Requirements

Notation: "DF" = Data Fiduciary; "DP" = Data Principal; "Board" = Data Protection Board of India.
All Rule references are to the DPDP Rules, 2025 (G.S.R. 846(E)), English text, printed p. 26.

### 4.1 Intimation to affected Data Principals — Rule 7(1)

| ID | Rule ref | Requirement | Deadline | Notes / ambiguities |
|---|---|---|---|---|
| BR-DP-01 | r. 7(1); Act s.8(6) | On becoming aware of any personal data breach, the DF shall intimate "each affected Data Principal". | "without delay" from "becoming aware" | AMB-01 (awareness), AMB-02 (without delay), AMB-04 ("affected"), AMB-05 (no threshold). |
| BR-DP-02 | r. 7(1) | Intimation is given "to the best of its knowledge". | — | AMB-03: unclear whether this qualifies who is notified, what is said, or both. |
| BR-DP-03 | r. 7(1) | Intimation must be "in a concise, clear and plain manner". | — | Rule 7 states no language requirement. |
| BR-DP-04 | r. 7(1) | Channel: "through her user account or any mode of communication registered by her with the Data Fiduciary". "User account" is defined in r. 2(1)(c). | — | AMB-06: no fallback where the DP has neither a user account nor a registered mode. |
| BR-DP-05 | r. 7(1)(a) | Content: "a description of the breach, including its nature, extent and the timing of its occurrence". | Same as BR-DP-01 | — |
| BR-DP-06 | r. 7(1)(b) | Content: "the consequences relevant to her, that are likely to arise from the breach". | Same | Content must be tailored per DP ("relevant to her"). |
| BR-DP-07 | r. 7(1)(c) | Content: measures "implemented and being implemented" by the DF, "if any, to mitigate risk". | Same | — |
| BR-DP-08 | r. 7(1)(d) | Content: "the safety measures that she may take to protect her interests". | Same | — |
| BR-DP-09 | r. 7(1)(e) | Content: "business contact information of a person who is able to respond on behalf of the Data Fiduciary" to DP queries. | Same | Rule 7 does not require this to be the Data Protection Officer. |

### 4.2 Intimation to the Data Protection Board — Rule 7(2)

| ID | Rule ref | Requirement | Deadline | Notes / ambiguities |
|---|---|---|---|---|
| BR-BD-01 | r. 7(2)(a); Act s.8(6) | Initial intimation: "a description of the breach, including its nature, extent, timing and location of occurrence and the likely impact". | "without delay" from "becoming aware" | AMB-01, AMB-02, AMB-07 ("location"). No form, channel or portal is specified — AMB-08. |
| BR-BD-02 | r. 7(2)(b)(i) | Detailed report: "updated and detailed information in respect of such description". | "within seventy-two hours of becoming aware of the breach", or a longer period the Board allows (BR-BD-08) | AMB-01, AMB-09 (no further updates stated), AMB-18 (whether exactly 72:00:00 is within). |
| BR-BD-03 | r. 7(2)(b)(ii) | Detailed report: "the broad facts related to the events, circumstances and reasons leading to the breach". | 72 hours (as BR-BD-02) | — |
| BR-BD-04 | r. 7(2)(b)(iii) | Detailed report: "measures implemented or proposed, if any, to mitigate risk". | 72 hours | — |
| BR-BD-05 | r. 7(2)(b)(iv) | Detailed report: "any findings regarding the person who caused the breach". | 72 hours | AMB-11. |
| BR-BD-06 | r. 7(2)(b)(v) | Detailed report: "remedial measures taken to prevent recurrence of such breach". | 72 hours | — |
| BR-BD-07 | r. 7(2)(b)(vi) | Detailed report: "a report regarding the intimations given to affected Data Principals". | 72 hours | AMB-10: implies DP intimations should be under way or complete within 72 hours. |
| BR-BD-08 | r. 7(2)(b) | Extension: the 72-hour period may be extended to "such longer period as the Board may allow on a request made in writing in this behalf". | Request timing not stated | AMB-12. |

### 4.3 Cross-cutting

| ID | Rule ref | Requirement | Deadline | Notes / ambiguities |
|---|---|---|---|---|
| BR-GEN-01 | Act s.8(1); r. 7 | Duty rests on the DF, including for breaches at a Data Processor processing on its behalf. | — | AMB-13: no processor-to-DF timeline or awareness rule. |
| BR-GEN-02 | Act s.2(u); r. 2(2) | Trigger covers unauthorised processing and accidental disclosure, acquisition, sharing, use, alteration, destruction or loss of access that compromises confidentiality, integrity or availability. | — | Includes availability incidents (e.g. "loss of access"). AMB-05, AMB-17 (scope of the "compromises" clause). |
| BR-GEN-03 | Act s.17(1) | Breach intimation (s.8(6)) does not apply in the s.17(1)(a)–(f) cases. | — | AMB-15. |
| BR-GEN-04 | r. 1(4) as corrected; G.S.R. 843(E) cl. (c) | Rule 7 and Act s.8(6) apply from their commencement (§2). | See §2 | AMB-14. |

---

## 5. Ambiguities

| ID | Text | Ambiguity |
|---|---|---|
| AMB-01 | r. 7(1), 7(2): "On becoming aware" | **AMBIGUOUS.** The point of awareness is not defined. It is unclear whether awareness runs from first detection of a suspicious event, from confirmation that personal data was involved, or from awareness at a particular level of the organisation. The 72-hour clock in r. 7(2)(b) runs from this point. |
| AMB-02 | r. 7(1), 7(2)(a): "without delay" | **AMBIGUOUS.** No maximum period is stated for DP intimation or for the initial Board intimation. Only the detailed Board report has a fixed outer limit (72 hours). |
| AMB-03 | r. 7(1): "to the best of its knowledge" | **AMBIGUOUS.** It is unclear whether this phrase limits the duty to DPs the DF knows are affected, limits the content to what the DF currently knows, or both. It also does not say whether DPs who are identified later must be notified. |
| AMB-04 | r. 7(1): "each affected Data Principal" | **AMBIGUOUS.** "Affected" is not defined in the Rules or the Act. It is unclear whether it means anyone whose data was involved or only those facing likely consequences. |
| AMB-05 | r. 7; Act s.2(u), s.8(6) | **AMBIGUOUS.** Neither text states a risk, harm or severity threshold. On the text, any personal data breach triggers both intimations. Whether a materiality filter can be applied is not addressed. |
| AMB-06 | r. 7(1): "through her user account or any mode of communication registered by her" | **AMBIGUOUS.** No alternative channel (e.g. public notice) is stated for DPs who have no user account or registered contact mode, or whose registered contact was itself compromised. |
| AMB-07 | r. 7(2)(a): "location of occurrence" | **AMBIGUOUS.** It could mean a geographic location, the system or environment, or the entity (e.g. Data Processor) where the breach occurred. |
| AMB-08 | Act s.8(6), s.40(2)(f): "form and manner"; r. 7(2) | **AMBIGUOUS.** The Act delegates "form and manner" of Board intimation to the rules. Rule 7(2) prescribes content and timing but no form, template, channel, address or portal. Rule 20 says the Board functions as a "digital office" and may adopt "techno-legal measures", but it names no submission channel. See §6. |
| AMB-09 | r. 7(2)(b)(i): "updated and detailed information" | **AMBIGUOUS.** No obligation to send further updates after the 72-hour report is stated, even if the investigation continues. |
| AMB-10 | r. 7(2)(b)(vi): "a report regarding the intimations given to affected Data Principals" | **AMBIGUOUS.** Because this report is due within 72 hours, it implies DP intimations are expected within that window, but r. 7(1) says only "without delay". The text does not say what to report if DP intimation is incomplete at 72 hours. |
| AMB-11 | r. 7(2)(b)(iv): "any findings regarding the person who caused the breach" | **AMBIGUOUS.** The required depth is unclear (identity, attribution, internal or external actor). It is also unclear whether "no findings yet" satisfies this item. |
| AMB-12 | r. 7(2)(b): "such longer period as the Board may allow on a request made in writing" | **AMBIGUOUS.** The text gives no deadline for making the request (e.g. before 72 hours expire), no grounds, no format, no channel and no response time. It does not say what applies while a request is pending. |
| AMB-13 | Act s.8(1); r. 7 | **AMBIGUOUS.** Rule 7 binds only the DF. It is not stated whether a Data Processor's awareness counts as the DF's awareness for the 72-hour clock. No processor notification period is set; r. 6(1)(f) requires only "appropriate provision in the contract" for security safeguards. |
| AMB-14 | r. 1(4) (as corrected); G.S.R. 843(E) cl. (c) | **AMBIGUOUS.** Commencement is expressed as "eighteen months after the date of publication in the Official Gazette"; no calendar date is printed. The exact date depends on (a) the publication date (13 Nov 2025 is printed on the Gazette) and (b) the method of computing "eighteen months after", which the Rules do not state. This document does not compute a date. A date **is computed elsewhere**, and is a computation, not a date stated in the Rules: `commencementBanner()` in `src/core/commencement.ts` returns 13 May 2027 (publication date plus 18 calendar months, from 00:00 IST) with its assumption and an alternative reading (14 May 2027); the intake page's commencement panel and the README "Status" section show it with that label. G.S.R. 843(E) uses "from the date of publication of this gazette" and was **not** checked for a corrigendum. |
| AMB-15 | Act s.17(1) | **AMBIGUOUS** for implementation. Breach intimation does not apply in s.17(1)(a)–(f) cases. Whether a processing activity falls within those cases needs case-by-case legal determination. Act s.17(2)–(5) (further exemptions) were not analysed. |
| AMB-16 | Act Schedule, item 2 (penalty) | **AMBIGUOUS (extraction).** The Schedule is a three-column table. The amount "May extend to two hundred crore rupees" was paired with item 2 by row order in the extracted text. Confirm against the printed table (Act PDF, printed p. 21). |
| AMB-17 | Act s.2(u): "any unauthorised processing of personal data or accidental disclosure, acquisition, sharing, use, alteration, destruction or loss of access to personal data, that compromises the confidentiality, integrity or availability of personal data" | **AMBIGUOUS.** It is unclear whether the closing clause "that compromises the confidentiality, integrity or availability" qualifies "unauthorised processing" as well as the "accidental …" events. Under one reading, any unauthorised processing is a personal data breach. Under the other, it is a breach only if it also compromises confidentiality, integrity or availability. |
| AMB-18 | r. 7(2)(b): "within seventy-two hours of becoming aware of the breach" | **AMBIGUOUS.** The text does not say whether the end-point is inclusive, i.e. whether a report made at exactly 72:00:00 after becoming aware is "within seventy-two hours". It also does not state the unit of precision (hour, minute or second) to which the period is measured. |
| AMB-19 | Act s.2(j): "“Data Principal” means the individual to whom the personal data relates and where such individual is— (i) a child, includes the parents or lawful guardian of such a child; (ii) a person with disability, includes her lawful guardian, acting on her behalf" | **AMBIGUOUS.** Relates to BR-DP-01 and BR-DP-04. Rule 7(1) requires intimation to "each affected Data Principal" through "her user account or any mode of communication registered by her". Where the individual is a child or a person with disability, the definition includes the parents or lawful guardian. It is not stated whether the intimation goes to the individual, the parents or lawful guardian, or both, nor whose user account or registered mode is meant. |
| AMB-20 | Act s.2(i): "“Data Fiduciary” means any person who alone or in conjunction with other persons determines the purpose and means of processing of personal data" | **AMBIGUOUS.** Relates to BR-DP-01 and BR-BD-02. Rule 7 places the intimation duty on "the Data Fiduciary". Where more than one person determines the purpose and means of the processing in conjunction, it is not stated which of them intimates the Data Principals and the Board, whether each must, or how duplicate notices to the same Data Principal are to be handled. |

---

## 6. Data Protection Board — breach-report format or portal

Checked: 2026-10-22, approx. 12:15–12:20 IST.

| Check | URL | Result |
|---|---|---|
| Rules text (all English rules and schedules) searched for "breach", "intimat", "form", "portal", "Schedule" | `docs/source/dpdp_rules_2025.pdf` | No breach-report form, template or portal is prescribed. Rule 20 (Board as "digital office") names no channel. |
| Candidate Board domain | https://dpb.gov.in/ and https://www.dpb.gov.in/ | DNS did not resolve. Not a working site at check time. |
| Web search for an official Board website or portal (limited to gov.in / nic.in / meity.gov.in) | — | **None found.** No gov.in page identified as the Board's official website or a breach-intimation portal. One commercial (non-government) site named a "dpdpa-grievance.gov.in" portal. That claim is unverified and was not used. |
| MeitY data-protection page | https://www.meity.gov.in/data-protection-framework | Page returns a JavaScript application shell. Its listings could not be read without a browser. **Not verified.** |
| MeitY notice on Board appointments | https://www.meity.gov.in/static/uploads/2026/05/53b1bcf01cab9a0adde463e73fbc3417.pdf | Invites applications for "Chairperson and four other Members". Describes the Board as "digital-by-design". No breach-reporting format or portal mentioned. (Not saved to `docs/source/`.) |

**Result: none found.** No Board-published breach-report format or portal was located from official
sources on 2026-10-22. This is not proof that none exists: the MeitY site could not be machine-read, and no
official Board website was identified.

---

## 7. Not verified / open items

1. **Amendments after 11 Dec 2025.** Searches of meity.gov.in / egazette.gov.in found no amendment to the
   Rules after the G.S.R. 892(E) corrigendum. The search was not exhaustive; the e-Gazette was not searched
   directly.
2. **Act amendments.** The Act PDF is the text as published on 11 Aug 2023. It was not compared with a
   consolidated, as-amended version (India Code timed out / returned 403).
3. **Corrigendum to G.S.R. 843(E).** Not checked.
4. **Hindi text.** The Hindi Rule 7 (printed p. 4) was not compared with the English text.
5. **Board website / portal.** See §6.
6. **Text extraction.** Quotes were taken from machine-extracted PDF text (pypdf). Spacing artefacts (e.g.
   "seventy -two") were normalised. Quotes should be spot-checked against the printed pages before external
   use.
