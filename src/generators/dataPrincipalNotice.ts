import type { AmbiguityId } from "../core/ambiguities";
import type { Incident } from "../core/types";
import { applyAmbiguities, determinationLines, instant, listIfAny, listRequired, renderDraft, section, text, type Draft } from "./render";

/** Business contact details are deliberately not stored in the incident (no personal data). */
export const CONTACT_TO_INSERT = "[INSERT BUSINESS CONTACT INFORMATION — recorded as available; not stored in the incident]";

/**
 * Plain-text draft of the intimation to affected Data Principals under r. 7(1).
 * One section per content obligation BR-DP-05 to BR-DP-09.
 */
export function generateDataPrincipalNotice(incident: Incident): Draft {
  const d = incident.description;
  const m = incident.mitigation;

  const sections = [
    section("BR-DP-05", "r. 7(1)(a)", "Description of the breach", [
      { field: "description.nature", label: "Nature", value: text(d.nature) },
      { field: "description.extent", label: "Extent", value: text(d.extent) },
      { field: "description.occurredAt", label: "Timing of occurrence", value: instant(d.occurredAt) },
    ]),
    section("BR-DP-06", "r. 7(1)(b)", "Consequences likely to arise for you", [
      { field: "description.consequencesForPrincipals", label: "Likely consequences", value: text(d.consequencesForPrincipals) },
    ]),
    section("BR-DP-07", "r. 7(1)(c)", "Measures to mitigate risk", [
      { field: "mitigation.implemented", label: "Measures implemented", value: listIfAny(m.implemented) },
      { field: "mitigation.proposed", label: "Measures being implemented", value: listIfAny(m.proposed) },
    ]),
    section("BR-DP-08", "r. 7(1)(d)", "Safety measures you may take", [
      { field: "mitigation.safetyMeasuresForPrincipals", label: "Safety measures", value: listRequired(m.safetyMeasuresForPrincipals) },
    ]),
    section("BR-DP-09", "r. 7(1)(e)", "Who can answer your questions", [
      {
        field: "queryContactAvailable",
        label: "Business contact",
        value: incident.queryContactAvailable === true ? [CONTACT_TO_INSERT] : null,
      },
    ]),
  ];

  const ap = incident.affectedPrincipals;
  const always: AmbiguityId[] = ["AMB-01", "AMB-02", "AMB-03", "AMB-04", "AMB-05"];
  if ((ap.noRegisteredChannel ?? 0) > 0 || (ap.registeredChannelCompromised ?? 0) > 0) always.push("AMB-06");

  const determination = determinationLines(incident);

  return renderDraft({
    kind: "data_principal_notice",
    title: "Intimation of personal data breach to affected Data Principals (r. 7(1))",
    preamble: [{ field: "incidentId", label: "Incident reference", value: text(incident.incidentId) }],
    preambleNotes: [
      'Send: "without delay" after becoming aware (r. 7(1), BR-DP-01), to each affected Data Principal.',
      "Channel: the recipient's user account or a mode of communication registered with the Data Fiduciary (BR-DP-04).",
      ...determination.lines,
    ],
    sections,
    ambiguities: applyAmbiguities(always, determination.interpretation),
    interpretation: determination.interpretation,
    extraReview: [
      'Consequences (BR-DP-06) are stated as "relevant to her" for each recipient group, not generically.',
      'Items under "Measures being implemented" come from mitigation.proposed: confirm each is actually being implemented (r. 7(1)(c)).',
      "Content reflects what the Data Fiduciary knows now (BR-DP-02, \"to the best of its knowledge\").",
      "Delivery uses the user account or a registered mode (BR-DP-04); recipients with no usable channel are listed for decision (AMB-06).",
      "Language(s) of the notice chosen deliberately: Rule 7 states no language requirement.",
    ],
  });
}
