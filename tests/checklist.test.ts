import { describe, expect, it } from "vitest";
import { evaluateBreachChecklist } from "../src/core/checklist";
import { baseIncident, withChanges } from "./fixtures";

const ids = (r: { interpretation: { ambiguityId: string }[] }) => r.interpretation.map((i) => i.ambiguityId);

describe("evaluateBreachChecklist", () => {
  it("meets the definition and requires intimation, with no materiality filter (AMB-05)", () => {
    const r = evaluateBreachChecklist(baseIncident());
    expect(r.definition).toBe("meets_definition");
    expect(r.intimation).toBe("required");
    expect(ids(r)).toContain("AMB-05");
  });

  it("counts availability-only incidents (loss of access)", () => {
    const r = evaluateBreachChecklist(
      withChanges((i) => {
        i.classification.eventTypes = ["accidental_loss_of_access"];
        i.classification.compromises = { confidentiality: false, integrity: false, availability: true };
      }),
    );
    expect(r.definition).toBe("meets_definition");
  });

  it("does not meet the definition when no personal data is involved", () => {
    const r = evaluateBreachChecklist(withChanges((i) => (i.classification.involvesPersonalData = false)));
    expect(r.definition).toBe("does_not_meet_definition");
    expect(r.intimation).toBe("not_required_on_facts_given");
  });

  it("returns indeterminate with missing facts listed", () => {
    const r = evaluateBreachChecklist(
      withChanges((i) => {
        i.classification.involvesPersonalData = null;
        i.classification.eventTypes = [];
        i.classification.compromises = { confidentiality: null, integrity: false, availability: false };
      }),
    );
    expect(r.definition).toBe("indeterminate");
    expect(r.intimation).toBe("indeterminate");
    expect(r.missingFacts).toEqual([
      "classification.involvesPersonalData",
      "classification.eventTypes",
      "classification.compromises",
    ]);
  });

  it("flags unauthorised processing without compromise as AMB-17, not a silent choice", () => {
    const r = evaluateBreachChecklist(
      withChanges((i) => {
        i.classification.eventTypes = ["unauthorised_processing"];
        i.classification.compromises = { confidentiality: false, integrity: false, availability: false };
      }),
    );
    expect(r.definition).toBe("indeterminate");
    expect(ids(r)).toEqual(["AMB-17"]);
  });

  it("never excuses intimation on an exemption claim (AMB-15)", () => {
    const r = evaluateBreachChecklist(
      withChanges((i) => (i.classification.exemptionClaims = [{ clause: "c", basis: "investigation" }])),
    );
    expect(r.intimation).toBe("requires_legal_determination");
    expect(ids(r)).toContain("AMB-15");
  });
});
