import { describe, expect, it } from "vitest";
import { evaluateContentCompleteness } from "../src/core/content";
import { baseIncident, withChanges } from "./fixtures";

const statuses = (items: { requirementId: string; status: string }[]) =>
  Object.fromEntries(items.map((i) => [i.requirementId, i.status]));

describe("evaluateContentCompleteness", () => {
  it("marks every element present for a complete record with DP intimation sent", () => {
    const r = evaluateContentCompleteness(
      withChanges((i) => {
        i.noticesSent = [{ kind: "dp_intimation", sentAt: "2026-10-20T12:00:00+05:30", recipientCount: 100, channel: "user_account" }];
      }),
    );
    for (const group of [r.dataPrincipalNotice, r.boardInitial, r.boardDetailed]) {
      expect(group.every((i) => i.status === "present")).toBe(true);
    }
  });

  it("lists missing facts per requirement", () => {
    const r = evaluateContentCompleteness(
      withChanges((i) => {
        i.description.extent = null;
        i.description.location = null;
        i.mitigation.implemented = null;
        i.mitigation.safetyMeasuresForPrincipals = [];
        i.queryContactAvailable = null;
      }),
    );
    expect(statuses(r.dataPrincipalNotice)).toEqual({
      "BR-DP-05": "missing",
      "BR-DP-06": "present",
      "BR-DP-07": "missing",
      "BR-DP-08": "missing",
      "BR-DP-09": "missing",
    });
    expect(r.boardInitial[0]?.missingFields).toEqual(["description.extent", "description.location"]);
    expect(r.boardDetailed.find((i) => i.requirementId === "BR-BD-02")?.status).toBe("missing");
    expect(r.boardDetailed.find((i) => i.requirementId === "BR-BD-07")?.status).toBe("missing");
    expect(r.interpretation.map((i) => i.ambiguityId)).toContain("AMB-10");
  });

  it("accepts an empty list only where the rule says 'if any'", () => {
    const r = evaluateContentCompleteness(
      withChanges((i) => {
        i.mitigation.implemented = [];
        i.mitigation.remedialMeasuresAgainstRecurrence = [];
      }),
    );
    expect(statuses(r.dataPrincipalNotice)["BR-DP-07"]).toBe("present");
    expect(statuses(r.boardDetailed)["BR-BD-04"]).toBe("present");
    expect(statuses(r.boardDetailed)["BR-BD-06"]).toBe("missing");
  });

  it("marks 'no findings yet' for review rather than deciding (AMB-11)", () => {
    const r = evaluateContentCompleteness(
      withChanges((i) => (i.description.findingsOnResponsiblePerson = { status: "none_yet", summary: null })),
    );
    expect(statuses(r.boardDetailed)["BR-BD-05"]).toBe("needs_review");
    expect(r.interpretation.map((i) => i.ambiguityId)).toContain("AMB-11");
  });

  it("always notes AMB-09 and notes AMB-07 when a location is recorded", () => {
    const ids = evaluateContentCompleteness(baseIncident()).interpretation.map((i) => i.ambiguityId);
    expect(ids).toEqual(expect.arrayContaining(["AMB-07", "AMB-09"]));
  });
});
