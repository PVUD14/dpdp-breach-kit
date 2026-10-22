import { describe, expect, it } from "vitest";
import requirements from "../docs/requirements.md?raw";
import { evaluateBreachChecklist } from "../src/core/checklist";
import { commencementBanner } from "../src/core/commencement";
import { evaluateContentCompleteness } from "../src/core/content";
import { computeBoardReportDeadline } from "../src/core/deadline";
import { trackWithoutDelay } from "../src/core/withoutDelay";
import { withChanges } from "./fixtures";

/** An incident that exercises as many interpretation branches as possible. */
const busy = withChanges((i) => {
  i.awareness.processorInvolved = true;
  i.awareness.processorAwareAt = "2026-10-19T21:00:00+05:30";
  i.classification.exemptionClaims = [{ clause: "c", basis: "test" }];
  i.affectedPrincipals.identified = 50;
  i.affectedPrincipals.noRegisteredChannel = 3;
  i.description.findingsOnResponsiblePerson = { status: "none_yet", summary: null };
  i.extension.requestedAt = "2026-10-22T09:00:00+05:30";
});

/** Unauthorised processing with nothing compromised (AMB-17). */
const uncompromised = withChanges((i) => {
  i.classification.eventTypes = ["unauthorised_processing"];
  i.classification.compromises = { confidentiality: false, integrity: false, availability: false };
});

describe("traceability to docs/requirements.md", () => {
  const now = "2026-10-23T09:00:00+05:30"; // exactly 72h after busy's fiduciary awareness
  const all = [
    ...evaluateBreachChecklist(busy).interpretation,
    ...evaluateBreachChecklist(uncompromised).interpretation,
    ...computeBoardReportDeadline(busy, { basis: "fiduciary", now }).interpretation,
    ...trackWithoutDelay(busy, { basis: "fiduciary", now }).interpretation,
    ...commencementBanner(now).interpretation,
    ...evaluateContentCompleteness(busy).interpretation,
  ];

  it("cites only AMB IDs that exist in requirements §5", () => {
    const section5 = requirements.slice(requirements.indexOf("## 5. Ambiguities"));
    for (const { ambiguityId } of all) {
      expect(section5, ambiguityId).toContain(`| ${ambiguityId} |`);
    }
  });

  it("exercises the formerly unmapped ambiguities AMB-17 and AMB-18", () => {
    const ids = all.map((i) => i.ambiguityId);
    expect(ids).toContain("AMB-17");
    expect(ids).toContain("AMB-18");
  });

  it("cites only requirement IDs that exist in requirements §4", () => {
    const section4 = requirements.slice(requirements.indexOf("## 4. Requirements"), requirements.indexOf("## 5."));
    for (const id of new Set(all.flatMap((i) => i.requirementIds))) {
      expect(section4, id).toContain(`| ${id} |`);
    }
  });

  it("records a choice and at least one alternative for every interpretation", () => {
    expect(all.length).toBeGreaterThan(0);
    for (const i of all) {
      expect(i.choice.length).toBeGreaterThan(0);
      expect(i.alternatives.length).toBeGreaterThan(0);
    }
  });
});
