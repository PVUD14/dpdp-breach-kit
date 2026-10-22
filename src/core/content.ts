import { interpretation, type Interpretation, type RequirementId } from "./ambiguities";
import type { Incident } from "./types";

export type ContentStatus = "present" | "missing" | "needs_review";

export interface ContentItem {
  requirementId: RequirementId;
  citation: string;
  status: ContentStatus;
  missingFields: string[];
  note: string | null;
}

export interface ContentCompleteness {
  dataPrincipalNotice: ContentItem[];
  boardInitial: ContentItem[];
  boardDetailed: ContentItem[];
  interpretation: Interpretation[];
}

type FieldCheck = [field: string, present: boolean];

const text = (v: string | null): boolean => v !== null && v.trim().length > 0;
const recorded = (v: string[] | null): boolean => v !== null;
const nonEmpty = (v: string[] | null): boolean => v !== null && v.length > 0;

function item(
  requirementId: RequirementId,
  citation: string,
  checks: FieldCheck[],
  note: string | null = null,
): ContentItem {
  const missingFields = checks.filter(([, ok]) => !ok).map(([f]) => f);
  return { requirementId, citation, status: missingFields.length ? "missing" : "present", missingFields, note };
}

/**
 * Checks that the facts needed for each required content element of r. 7(1) and r. 7(2) are
 * recorded. It checks presence only; the adequacy of free text is for human review.
 *
 * For mitigation lists, null means "not recorded" and [] means "recorded as none". Where the
 * rule says "if any" (r. 7(1)(c), 7(2)(b)(iii)) an empty list is accepted; where it does not
 * (r. 7(1)(d), 7(2)(b)(v)) at least one entry is required.
 */
export function evaluateContentCompleteness(incident: Incident): ContentCompleteness {
  const d = incident.description;
  const m = incident.mitigation;
  const notes: Interpretation[] = [];

  const description: FieldCheck[] = [
    ["description.nature", text(d.nature)],
    ["description.extent", text(d.extent)],
    ["description.occurredAt", d.occurredAt !== null],
  ];

  const dataPrincipalNotice = [
    item("BR-DP-05", "r. 7(1)(a)", description),
    item("BR-DP-06", "r. 7(1)(b)", [["description.consequencesForPrincipals", text(d.consequencesForPrincipals)]],
      'Must be "relevant to her": per-principal tailoring is for human review.'),
    item("BR-DP-07", "r. 7(1)(c)", [
      ["mitigation.implemented", recorded(m.implemented)],
      ["mitigation.proposed", recorded(m.proposed)],
    ]),
    item("BR-DP-08", "r. 7(1)(d)", [["mitigation.safetyMeasuresForPrincipals", nonEmpty(m.safetyMeasuresForPrincipals)]]),
    item("BR-DP-09", "r. 7(1)(e)", [["queryContactAvailable", incident.queryContactAvailable === true]]),
  ];

  const boardInitial = [
    item("BR-BD-01", "r. 7(2)(a)", [
      ...description,
      ["description.location", text(d.location)],
      ["description.likelyImpact", text(d.likelyImpact)],
    ]),
  ];
  if (text(d.location)) {
    notes.push(
      interpretation(
        "AMB-07",
        ["BR-BD-01"],
        "description.location is checked for presence only; which sense of \"location\" it records is not checked.",
        ["Geographic location.", "System or environment.", "Entity (e.g. Data Processor) where it occurred."],
      ),
    );
  }

  const findings = d.findingsOnResponsiblePerson;
  let findingsItem: ContentItem;
  if (findings.status === null) {
    findingsItem = item("BR-BD-05", "r. 7(2)(b)(iv)", [["description.findingsOnResponsiblePerson.status", false]]);
  } else if (findings.status === "none_yet") {
    findingsItem = {
      requirementId: "BR-BD-05",
      citation: "r. 7(2)(b)(iv)",
      status: "needs_review",
      missingFields: [],
      note: "Recorded as no findings yet.",
    };
    notes.push(
      interpretation(
        "AMB-11",
        ["BR-BD-05"],
        '"No findings yet" is marked needs_review, neither satisfied nor missing.',
        ['"Any findings" is satisfied by stating there are none.', "Some attribution is required."],
      ),
    );
  } else {
    findingsItem = item("BR-BD-05", "r. 7(2)(b)(iv)", [["description.findingsOnResponsiblePerson.summary", text(findings.summary)]]);
  }

  const dpNotices = incident.noticesSent.filter((n) => n.kind === "dp_intimation");
  const dpReportItem = item("BR-BD-07", "r. 7(2)(b)(vi)", [["noticesSent[kind=dp_intimation]", dpNotices.length > 0]]);
  if (dpNotices.length === 0) {
    notes.push(
      interpretation(
        "AMB-10",
        ["BR-BD-07"],
        "No Data Principal intimation is recorded, so the report on intimations is marked missing.",
        ["Report that intimation is in progress, with no intimations yet given."],
      ),
    );
  }

  const boardDetailed = [
    item("BR-BD-02", "r. 7(2)(b)(i)", boardInitial[0]!.missingFields.map((f): FieldCheck => [f, false]),
      '"Updated and detailed" is relative to the initial intimation: depth is for human review.'),
    item("BR-BD-03", "r. 7(2)(b)(ii)", [["description.eventsCircumstancesReasons", text(d.eventsCircumstancesReasons)]]),
    item("BR-BD-04", "r. 7(2)(b)(iii)", [
      ["mitigation.implemented", recorded(m.implemented)],
      ["mitigation.proposed", recorded(m.proposed)],
    ]),
    findingsItem,
    item("BR-BD-06", "r. 7(2)(b)(v)", [["mitigation.remedialMeasuresAgainstRecurrence", nonEmpty(m.remedialMeasuresAgainstRecurrence)]]),
    dpReportItem,
  ];

  notes.push(
    interpretation(
      "AMB-09",
      ["BR-BD-02"],
      "Only the single detailed report under r. 7(2)(b) is checked; no later updates are expected or tracked.",
      ["Send further updates as the investigation progresses."],
    ),
  );

  return { dataPrincipalNotice, boardInitial, boardDetailed, interpretation: notes };
}
