import type { AmbiguityId } from "../core/ambiguities";

/**
 * One-line reasons for each ambiguity, condensed from docs/requirements.md §5. The full text
 * there governs; tests/traceability.test.ts and tests/generators.test.ts check the IDs exist.
 */
export const AMBIGUITY_SUMMARIES: Readonly<Record<AmbiguityId, string>> = {
  "AMB-19": "Confirm recipients and registered channels for children and persons with disability; the tool does not choose between principals, parents or lawful guardians.",
  "AMB-20": "Where several organisations act as fiduciaries, agree responsibility for notices and handling duplicate notices; the tool does not assign responsibility.",
  "AMB-01": '"On becoming aware" is not defined; the 72-hour clock and "without delay" both run from it.',
  "AMB-02": '"Without delay" has no stated maximum for Data Principal intimation or the initial Board intimation.',
  "AMB-03": '"To the best of its knowledge" may limit who is notified, what is said, or both; later-identified principals are not addressed.',
  "AMB-04": '"Affected" Data Principal is not defined.',
  "AMB-05": "No risk, harm or severity threshold is stated; on the text any personal data breach triggers intimation.",
  "AMB-06": "No fallback channel is stated for principals without a user account or registered mode, or whose channel was compromised.",
  "AMB-07": '"Location of occurrence" may mean a geographic place, a system or environment, or an entity.',
  "AMB-08": "No form, template, channel, address or portal is prescribed for intimation to the Board.",
  "AMB-09": "No obligation to send updates after the 72-hour detailed report is stated.",
  "AMB-10": "The 72-hour report must cover Data Principal intimations, but r. 7(1) says only \"without delay\".",
  "AMB-11": 'The required depth of "any findings regarding the person who caused the breach" is unclear, including whether "none yet" suffices.',
  "AMB-12": "The extension request has no stated deadline, grounds, format, channel or response time; the position while pending is not stated.",
  "AMB-13": "It is not stated whether a Data Processor's awareness counts as the Data Fiduciary's awareness.",
  "AMB-14": "Commencement is relative to publication; the method of computing \"eighteen months after\" is not stated.",
  "AMB-15": "Whether processing falls within an Act s.17(1) exemption needs case-by-case legal determination.",
  "AMB-16": "The penalty amount was paired with Schedule item 2 by row order in extracted text.",
  "AMB-17": 'It is unclear whether "that compromises the confidentiality, integrity or availability" also qualifies "unauthorised processing" in Act s.2(u).',
  "AMB-18": 'It is not stated whether a report at exactly 72:00:00 is "within seventy-two hours", or the unit of precision.',
};
