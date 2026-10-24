import { describe, expect, it } from "vitest";
import { baseIncident } from "./fixtures";
import { emptyResponse } from "../src/core/response";
import { beginnerHandoff, beginnerSteps } from "../src/ui/beginner";

describe("beginner handoff", () => {
  it("keeps unknown facts visible without inferring a deadline or sending notices", () => {
    const incident = baseIncident();
    incident.description.nature = null; incident.awareness.fiduciaryAwareAt = null;
    incident.dataCategories = []; incident.affectedPrincipals.estimatedTotal = null;
    const before = JSON.stringify(incident);
    const text = beginnerHandoff(incident);
    expect(text).toContain("What was noticed: Not known yet");
    expect(text).toContain("People possibly affected: Not known yet");
    expect(text).toContain("Find out when it was first noticed");
    expect(text).not.toContain("72 hours");
    expect(JSON.stringify(incident)).toBe(before);
    expect(beginnerSteps(incident)).toHaveLength(3);
  });
  it("changes the next step when containment is recorded and labels practice summaries", () => {
    const incident = baseIncident(); incident.response = emptyResponse();
    incident.response.containment = "contained";
    incident.response.practice = { scenario: "example", step: 0, startedAt: "2026-10-24T09:00:00+05:30" };
    expect(beginnerSteps(incident)[0]?.title).toBe("Confirm the problem has stopped");
    expect(beginnerHandoff(incident)).toContain("FICTIONAL PRACTICE — DO NOT SEND");
  });
  it("makes the first handoff specific to the reported situation without classifying it legally", () => {
    const incident = baseIncident(); incident.description.nature = "A device or file is missing";
    const before = JSON.stringify(incident.classification);
    expect(beginnerSteps(incident)[0]?.body).toContain("what is missing and when you last had it");
    incident.description.nature = "Information went to the wrong person";
    expect(beginnerSteps(incident)[0]?.body).toContain("coordinate contact with the recipient");
    expect(JSON.stringify(incident.classification)).toBe(before);
  });
});
