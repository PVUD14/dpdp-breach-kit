import type { AmbiguityId } from "../core/ambiguities";
import { evaluateContentCompleteness } from "../core/content";
import { toEpochMs, toIstDisplay } from "../core/time";
import type { Incident } from "../core/types";
import {
  applyAmbiguities,
  determinationLines,
  instant,
  listIfAny,
  listRequired,
  renderDraft,
  section,
  text,
  type Draft,
  type Field,
} from "./render";

export interface BoardReports {
  /** r. 7(2)(a): "without delay". */
  initial: Draft;
  /** r. 7(2)(b): within seventy-two hours, or a longer period the Board allows. */
  detailed: Draft;
}

function descriptionFields(incident: Incident): Field[] {
  const d = incident.description;
  return [
    { field: "description.nature", label: "Nature", value: text(d.nature) },
    { field: "description.extent", label: "Extent", value: text(d.extent) },
    { field: "description.occurredAt", label: "Timing of occurrence", value: instant(d.occurredAt) },
    { field: "description.location", label: "Location of occurrence", value: text(d.location) },
    { field: "description.likelyImpact", label: "Likely impact", value: text(d.likelyImpact) },
  ];
}

function awarenessFields(incident: Incident): Field[] {
  const a = incident.awareness;
  const fields: Field[] = [
    { field: "incidentId", label: "Incident reference", value: text(incident.incidentId) },
    { field: "awareness.fiduciaryAwareAt", label: "Data Fiduciary became aware (as recorded)", value: instant(a.fiduciaryAwareAt) },
  ];
  if (a.processorAwareAt !== null) {
    fields.push({ field: "awareness.processorAwareAt", label: "Data Processor became aware (as recorded)", value: instant(a.processorAwareAt) });
  }
  return fields;
}

function processorInvolved(incident: Incident): boolean {
  return incident.awareness.processorInvolved === true || incident.awareness.processorAwareAt !== null;
}

function findingsFields(incident: Incident): Field[] {
  const f = incident.description.findingsOnResponsiblePerson;
  const field = "description.findingsOnResponsiblePerson";
  if (f.status === null) return [{ field: `${field}.status`, label: "Findings", value: null }];
  if (f.status === "none_yet") return [{ field: `${field}.status`, label: "Findings", value: ["No findings recorded yet."] }];
  return [{ field: `${field}.summary`, label: "Findings", value: text(f.summary) }];
}

function intimationReportFields(incident: Incident): Field[] {
  const notices = incident.noticesSent
    .filter((n) => n.kind === "dp_intimation")
    .sort((a, b) => toEpochMs(a.sentAt) - toEpochMs(b.sentAt));
  const ap = incident.affectedPrincipals;
  const identified: Field = {
    field: "affectedPrincipals.identified",
    label: "Affected Data Principals identified",
    value: ap.identified === null ? null : [String(ap.identified)],
  };
  if (notices.length === 0) {
    return [{ field: "noticesSent[kind=dp_intimation]", label: "Intimations given", value: null }, identified];
  }

  const counts = notices.map((n) => n.recipientCount);
  const reached: Field = {
    field: "noticesSent[kind=dp_intimation].recipientCount",
    label: "Data Principals reached",
    value: counts.every((c) => c !== null) ? [String(counts.reduce<number>((s, c) => s + (c ?? 0), 0))] : null,
  };
  const channels = [...new Set(notices.map((n) => n.channel ?? "not recorded"))].join(", ");
  const first = notices[0]!;
  const last = notices[notices.length - 1]!;
  return [
    {
      field: "noticesSent[kind=dp_intimation]",
      label: "Intimations given",
      value: [
        `${notices.length} intimation batch(es), first ${toIstDisplay(toEpochMs(first.sentAt))}, ` +
          `last ${toIstDisplay(toEpochMs(last.sentAt))}; channels: ${channels}`,
      ],
    },
    reached,
    identified,
  ];
}

function extensionFields(incident: Incident): Field[] {
  const { requestedAt, grantedUntil } = incident.extension;
  return [
    {
      field: "extension.requestedAt",
      label: "Written request for a longer period",
      value: requestedAt === null ? ["None recorded."] : instant(requestedAt),
    },
    {
      field: "extension.grantedUntil",
      label: "Longer period allowed by the Board until",
      value: grantedUntil === null ? ["None recorded."] : instant(grantedUntil),
    },
  ];
}

/**
 * Plain-text drafts of the two Board intimations under r. 7(2): the initial description
 * (BR-BD-01) and the detailed report (BR-BD-02 to BR-BD-08), one section per obligation.
 */
export function generateBoardReports(incident: Incident): BoardReports {
  const m = incident.mitigation;
  const determination = determinationLines(incident);
  const content = evaluateContentCompleteness(incident).interpretation;
  const viaProcessor: AmbiguityId[] = processorInvolved(incident) ? ["AMB-13"] : [];
  const submission = "Submission channel: none prescribed (AMB-08).";

  const initialContent = content.filter((i) => i.requirementIds.includes("BR-BD-01"));
  const initial = renderDraft({
    kind: "board_initial",
    title: "Intimation of personal data breach to the Data Protection Board — initial (r. 7(2)(a))",
    preamble: awarenessFields(incident),
    preambleNotes: ['Due: "without delay" after becoming aware (r. 7(2)(a)).', submission, ...determination.lines],
    sections: [section("BR-BD-01", "r. 7(2)(a)", "Description of the breach", descriptionFields(incident))],
    ambiguities: applyAmbiguities(
      ["AMB-01", "AMB-02", "AMB-07", "AMB-08", ...viaProcessor],
      [...determination.interpretation, ...initialContent],
    ),
    interpretation: [...determination.interpretation, ...initialContent],
    extraReview: ["Location of occurrence states which sense is meant: place, system or entity (AMB-07)."],
  });

  const detailedIds = ["BR-BD-02", "BR-BD-03", "BR-BD-04", "BR-BD-05", "BR-BD-06", "BR-BD-07"];
  const detailedContent = content.filter((i) => i.requirementIds.some((r) => detailedIds.includes(r)));
  const detailed = renderDraft({
    kind: "board_detailed",
    title: "Intimation of personal data breach to the Data Protection Board — detailed report (r. 7(2)(b))",
    preamble: awarenessFields(incident),
    preambleNotes: [
      "Due: within seventy-two hours of becoming aware, or such longer period as the Board allows on a written request (r. 7(2)(b)).",
      "The deadline is not computed in this draft: use computeBoardReportDeadline with an explicit awareness basis " +
        `(${["AMB-01", ...viaProcessor].join(", ")}).`,
      submission,
      ...determination.lines,
    ],
    sections: [
      section("BR-BD-02", "r. 7(2)(b)(i)", "Updated and detailed description", descriptionFields(incident)),
      section("BR-BD-03", "r. 7(2)(b)(ii)", "Events, circumstances and reasons leading to the breach", [
        {
          field: "description.eventsCircumstancesReasons",
          label: "Broad facts",
          value: text(incident.description.eventsCircumstancesReasons),
        },
      ]),
      section("BR-BD-04", "r. 7(2)(b)(iii)", "Measures implemented or proposed to mitigate risk", [
        { field: "mitigation.implemented", label: "Implemented", value: listIfAny(m.implemented) },
        { field: "mitigation.proposed", label: "Proposed", value: listIfAny(m.proposed) },
      ]),
      section("BR-BD-05", "r. 7(2)(b)(iv)", "Findings regarding the person who caused the breach", findingsFields(incident)),
      section("BR-BD-06", "r. 7(2)(b)(v)", "Remedial measures to prevent recurrence", [
        {
          field: "mitigation.remedialMeasuresAgainstRecurrence",
          label: "Remedial measures taken",
          value: listRequired(m.remedialMeasuresAgainstRecurrence),
        },
      ]),
      section("BR-BD-07", "r. 7(2)(b)(vi)", "Report on intimations given to affected Data Principals", intimationReportFields(incident)),
      section("BR-BD-08", "r. 7(2)(b)", "Extension of time", extensionFields(incident)),
    ],
    ambiguities: applyAmbiguities(
      ["AMB-01", "AMB-08", "AMB-09", "AMB-10", "AMB-12", "AMB-18", ...viaProcessor],
      [...determination.interpretation, ...detailedContent],
    ),
    interpretation: [...determination.interpretation, ...detailedContent],
    extraReview: [
      '"Updated and detailed" (BR-BD-02) adds to the initial intimation rather than repeating it.',
      "Report on intimations (BR-BD-07) matches the notices actually sent.",
    ],
  });

  return { initial, detailed };
}
