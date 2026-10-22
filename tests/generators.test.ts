import { describe, expect, it } from "vitest";
import requirements from "../docs/requirements.md?raw";
import type { Incident } from "../src/core/types";
import { validateIncident } from "../src/core/validate";
import {
  AMBIGUITY_SUMMARIES,
  CONTACT_TO_INSERT,
  DRAFT_HEADER,
  NOT_PROVIDED,
  generateBoardReports,
  generateDataPrincipalNotice,
  type Draft,
} from "../src/generators";
import { minimalIncident, withChanges } from "./fixtures";

const section4 = requirements.slice(requirements.indexOf("## 4. Requirements"), requirements.indexOf("## 5."));
const section5 = requirements.slice(requirements.indexOf("## 5. Ambiguities"));

/** baseIncident plus a recorded Data Principal intimation, so every required fact is present. */
function completeIncident(): Incident {
  return withChanges((i) => {
    i.noticesSent = [{ kind: "dp_intimation", sentAt: "2026-10-20T12:00:00+05:30", recipientCount: 100, channel: "user_account" }];
  });
}

type Remover = (i: Incident) => void;

const DESCRIPTION: Record<string, Remover> = {
  "description.nature": (i) => (i.description.nature = null),
  "description.extent": (i) => (i.description.extent = null),
  "description.occurredAt": (i) => (i.description.occurredAt = null),
};

const DP_REQUIRED: Record<string, Remover> = {
  ...DESCRIPTION,
  "description.consequencesForPrincipals": (i) => (i.description.consequencesForPrincipals = null),
  "mitigation.implemented": (i) => (i.mitigation.implemented = null),
  "mitigation.proposed": (i) => (i.mitigation.proposed = null),
  "mitigation.safetyMeasuresForPrincipals": (i) => (i.mitigation.safetyMeasuresForPrincipals = null),
  queryContactAvailable: (i) => (i.queryContactAvailable = false),
};

const INITIAL_REQUIRED: Record<string, Remover> = {
  "awareness.fiduciaryAwareAt": (i) => (i.awareness.fiduciaryAwareAt = null),
  ...DESCRIPTION,
  "description.location": (i) => (i.description.location = null),
  "description.likelyImpact": (i) => (i.description.likelyImpact = null),
};

const DETAILED_REQUIRED: Record<string, Remover> = {
  ...INITIAL_REQUIRED,
  "description.eventsCircumstancesReasons": (i) => (i.description.eventsCircumstancesReasons = null),
  "mitigation.implemented": (i) => (i.mitigation.implemented = null),
  "mitigation.proposed": (i) => (i.mitigation.proposed = null),
  "description.findingsOnResponsiblePerson.status": (i) =>
    (i.description.findingsOnResponsiblePerson = { status: null, summary: null }),
  "mitigation.remedialMeasuresAgainstRecurrence": (i) => (i.mitigation.remedialMeasuresAgainstRecurrence = null),
  "noticesSent[kind=dp_intimation]": (i) => (i.noticesSent = []),
  "affectedPrincipals.identified": (i) => (i.affectedPrincipals.identified = null),
};

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

/** Checks a draft's missing facts against the expected set and that each one is visible. */
function expectMissing(draft: Draft, expected: string[], label: string): void {
  expect([...draft.missingFields].sort(), label).toEqual([...expected].sort());
  // The review checklist itself names the placeholder, so count only the draft body.
  const body = draft.text.slice(0, draft.text.indexOf("AMBIGUITIES THAT APPLY"));
  expect(count(body, NOT_PROVIDED), label).toBe(expected.length);
  for (const s of draft.sections) {
    expect(count(s.body.join("\n"), NOT_PROVIDED), `${label} ${s.requirementId}`).toBe(s.missingFields.length);
  }
}

/** Generates every subset of `removers`, applies it to a complete incident and checks the draft. */
function everyCombination(removers: Record<string, Remover>, pick: (i: Incident) => Draft): number {
  const fields = Object.keys(removers);
  for (let mask = 0; mask < 1 << fields.length; mask++) {
    const removed = fields.filter((_, b) => mask & (1 << b));
    const incident = completeIncident();
    for (const f of removed) removers[f]!(incident);
    expectMissing(pick(incident), removed, `missing=[${removed.join(",")}]`);
  }
  return 1 << fields.length;
}

function allDrafts(incident: Incident): Draft[] {
  const board = generateBoardReports(incident);
  return [generateDataPrincipalNotice(incident), board.initial, board.detailed];
}

describe("draft structure", () => {
  it("maps section headings one-to-one to BR obligations in docs/requirements.md §4", () => {
    const [dp, initial, detailed] = allDrafts(completeIncident());
    expect(dp!.sections.map((s) => s.requirementId)).toEqual(["BR-DP-05", "BR-DP-06", "BR-DP-07", "BR-DP-08", "BR-DP-09"]);
    expect(initial!.sections.map((s) => s.requirementId)).toEqual(["BR-BD-01"]);
    expect(detailed!.sections.map((s) => s.requirementId)).toEqual([
      "BR-BD-02", "BR-BD-03", "BR-BD-04", "BR-BD-05", "BR-BD-06", "BR-BD-07", "BR-BD-08",
    ]);
    for (const draft of [dp!, initial!, detailed!]) {
      for (const s of draft.sections) {
        expect(section4).toContain(`| ${s.requirementId} | ${s.citation}`);
        expect(draft.text).toContain(`${s.heading} [${s.requirementId} · ${s.citation}]`);
      }
    }
  });

  it("starts with the draft-aid header and ends with ambiguities then the plain-language checklist", () => {
    for (const draft of allDrafts(completeIncident())) {
      expect(draft.text.split("\n")[0]).toBe(DRAFT_HEADER);
      const amb = draft.text.indexOf("AMBIGUITIES THAT APPLY");
      const review = draft.text.indexOf("HUMAN REVIEW CHECKLIST — PLAIN LANGUAGE (BR-DP-03");
      const lastSection = draft.text.lastIndexOf(`[${draft.sections.at(-1)!.requirementId} ·`);
      expect(lastSection).toBeLessThan(amb);
      expect(amb).toBeLessThan(review);
      expect(draft.text.trimEnd().split("\n").at(-1)).toMatch(/^\[ \] /);
    }
  });

  it("lists only ambiguities documented in §5, each with its reason", () => {
    for (const id of Object.keys(AMBIGUITY_SUMMARIES)) expect(section5).toContain(`| ${id} |`);
    for (const draft of [...allDrafts(completeIncident()), ...allDrafts(minimalIncident())]) {
      expect(draft.ambiguities.length).toBeGreaterThan(0);
      for (const a of draft.ambiguities) {
        expect(section5).toContain(`| ${a.id} |`);
        expect(draft.text).toContain(`- ${a.id}: ${a.reason}`);
      }
    }
  });
});

describe("complete incident", () => {
  const incident = completeIncident();
  const drafts = allDrafts(incident);

  it("has no missing facts and no placeholders", () => {
    for (const d of drafts) expectMissing(d, [], d.kind);
  });

  it("uses incident values verbatim, with timestamps in IST", () => {
    const [dp, initial, detailed] = drafts;
    expect(dp!.text).toContain("Nature: Misconfigured storage bucket exposed export files");
    expect(dp!.text).toContain("Timing of occurrence: 19 Oct 2026, 22:15:00 IST");
    expect(dp!.text).toContain("Measures being implemented: None recorded.");
    expect(dp!.text).toContain(CONTACT_TO_INSERT);
    expect(initial!.text).toContain("Data Fiduciary became aware (as recorded): 20 Oct 2026, 09:00:00 IST");
    expect(detailed!.text).toContain("Findings: Internal configuration error");
    expect(detailed!.text).toContain("Data Principals reached: 100");
    expect(detailed!.text).toContain("Written request for a longer period: None recorded.");
  });

  it("matches the reviewed snapshot", () => {
    const [dp, initial, detailed] = drafts;
    expect(dp!.text).toMatchSnapshot("data principal notice");
    expect(initial!.text).toMatchSnapshot("board initial");
    expect(detailed!.text).toMatchSnapshot("board detailed");
  });
});

describe("minimal incident", () => {
  const incident = minimalIncident();

  it("is a valid incident record", () => {
    expect(validateIncident(incident).ok).toBe(true);
  });

  it("shows every required fact as a placeholder and invents nothing", () => {
    const [dp, initial, detailed] = allDrafts(incident);
    expect(dp!.missingFields).toEqual(Object.keys(DP_REQUIRED));
    expectMissing(dp!, Object.keys(DP_REQUIRED), "dp");
    expectMissing(initial!, Object.keys(INITIAL_REQUIRED), "initial");
    expectMissing(detailed!, Object.keys(DETAILED_REQUIRED), "detailed");

    // Every section body line is a placeholder, except the extension section, which records "None".
    for (const d of [dp!, initial!, detailed!]) {
      for (const s of d.sections.filter((x) => x.requirementId !== "BR-BD-08")) {
        for (const line of s.body) expect(line.endsWith(NOT_PROVIDED), `${s.requirementId}: ${line}`).toBe(true);
      }
    }
    expect(detailed!.sections.at(-1)!.body).toEqual([
      "Written request for a longer period: None recorded.",
      "Longer period allowed by the Board until: None recorded.",
    ]);
  });

  it("warns that intimation is not established by the checklist", () => {
    for (const d of allDrafts(incident)) {
      expect(d.text).toContain("definition = indeterminate; intimation = indeterminate");
      expect(d.text).toContain("WARNING: the checklist does not report intimation as required");
    }
  });
});

describe("every missing-field combination for required items", () => {
  it("keeps each remover's incident schema-valid", () => {
    for (const r of [...Object.values(DP_REQUIRED), ...Object.values(DETAILED_REQUIRED)]) {
      expect(validateIncident(withChanges(r)).ok).toBe(true);
    }
  });

  it("Data Principal notice: all 2^8 combinations", () => {
    expect(everyCombination(DP_REQUIRED, generateDataPrincipalNotice)).toBe(256);
  });

  it("Board initial intimation: all 2^6 combinations", () => {
    expect(everyCombination(INITIAL_REQUIRED, (i) => generateBoardReports(i).initial)).toBe(64);
  });

  it("Board detailed report: all 2^13 combinations", () => {
    expect(everyCombination(DETAILED_REQUIRED, (i) => generateBoardReports(i).detailed)).toBe(8192);
  });
});

describe("missing-value variants", () => {
  it("treats an empty list as missing only where the rule has no 'if any'", () => {
    const i = withChanges((x) => {
      x.mitigation.implemented = [];
      x.mitigation.safetyMeasuresForPrincipals = [];
      x.mitigation.remedialMeasuresAgainstRecurrence = [];
    });
    const dp = generateDataPrincipalNotice(i);
    expect(dp.missingFields).toEqual(["mitigation.safetyMeasuresForPrincipals"]);
    expect(dp.text).toContain("Measures implemented: None recorded.");
    expect(generateBoardReports(i).detailed.missingFields).toEqual([
      "mitigation.remedialMeasuresAgainstRecurrence",
      "noticesSent[kind=dp_intimation]",
    ]);
  });

  it("treats whitespace-only text as missing", () => {
    expect(generateDataPrincipalNotice(withChanges((x) => (x.description.nature = "   "))).missingFields).toEqual([
      "description.nature",
    ]);
  });

  it("asks for a findings summary when findings are recorded without one", () => {
    const d = generateBoardReports(
      withChanges((x) => (x.description.findingsOnResponsiblePerson = { status: "findings_recorded", summary: null })),
    ).detailed;
    expect(d.missingFields).toContain("description.findingsOnResponsiblePerson.summary");
  });

  it("states 'no findings yet' as recorded and cites AMB-11", () => {
    const d = generateBoardReports(
      withChanges((x) => (x.description.findingsOnResponsiblePerson = { status: "none_yet", summary: null })),
    ).detailed;
    expect(d.text).toContain("Findings: No findings recorded yet.");
    expect(d.ambiguities.find((a) => a.id === "AMB-11")?.applied.length).toBeGreaterThan(0);
  });

  it("does not total recipients when any notice lacks a count", () => {
    const d = generateBoardReports(
      withChanges((x) => {
        x.noticesSent = [
          { kind: "dp_intimation", sentAt: "2026-10-20T12:00:00+05:30", recipientCount: 60, channel: "user_account" },
          { kind: "dp_intimation", sentAt: "2026-10-20T13:00:00+05:30", recipientCount: null, channel: null },
        ];
      }),
    ).detailed;
    expect(d.missingFields).toEqual(["noticesSent[kind=dp_intimation].recipientCount"]);
  });
});

describe("conditional ambiguities", () => {
  it("adds AMB-13 to Board drafts when a processor is involved, and AMB-06 to the DP notice when channels are missing", () => {
    const i = withChanges((x) => {
      x.awareness.processorInvolved = true;
      x.awareness.processorAwareAt = "2026-10-19T21:00:00+05:30";
      x.affectedPrincipals.noRegisteredChannel = 2;
    });
    const board = generateBoardReports(i);
    expect(board.initial.ambiguities.map((a) => a.id)).toContain("AMB-13");
    expect(board.detailed.text).toContain("Data Processor became aware (as recorded): 19 Oct 2026, 21:00:00 IST");
    expect(generateDataPrincipalNotice(i).ambiguities.map((a) => a.id)).toContain("AMB-06");
    expect(generateDataPrincipalNotice(completeIncident()).ambiguities.map((a) => a.id)).not.toContain("AMB-06");
  });

  it("carries checklist interpretations (AMB-15, AMB-17) into every draft", () => {
    const i = withChanges((x) => {
      x.classification.eventTypes = ["unauthorised_processing"];
      x.classification.compromises = { confidentiality: false, integrity: false, availability: false };
    });
    for (const d of allDrafts(i)) expect(d.ambiguities.map((a) => a.id)).toContain("AMB-17");
    const exempt = withChanges((x) => (x.classification.exemptionClaims = [{ clause: "c", basis: "test" }]));
    for (const d of allDrafts(exempt)) expect(d.ambiguities.map((a) => a.id)).toContain("AMB-15");
  });
});
