import { describe, expect, it } from "vitest";
import { baseIncident } from "./fixtures";
import { emptyResponse, responseAssessment } from "../src/core/response";
import { validateIncident } from "../src/core/validate";
import { exportIncident, parseIncidentFile, incidentToForm, formToIncident } from "../src/ui/model";
import { responsePack } from "../src/ui/responsePack";
import { scenarios, practiceNow } from "../src/ui/workspace";
import { generateDataPrincipalNotice } from "../src/generators/dataPrincipalNotice";
import { generateBoardReports } from "../src/generators/boardReports";
import v2Schema from "../src/core/incident.v2.schema.json";
import responseSchema from "../src/core/response.schema.json";

const now = "2026-10-21T09:00:00+05:30";
function record() { return { ...baseIncident(), schemaVersion: 2 as const, response: emptyResponse() }; }
describe("response workspace", () => {
  it("publishes the same response schema used by incident validation", () => {
    expect(v2Schema.properties.response).toEqual(responseSchema);
  });
  it("round trips response work, clock assumptions, and action history through form and file", () => {
    const i = record(); i.response.basis = "processor"; i.response.basisReason = "Review vendor awareness";
    i.response.actions.push({ id: "a1", description: "Check containment", ownerRole: "IT", status: "done", updatedAt: now });
    i.response.history.push({ at: now, description: "Containment reviewed" });
    const converted = formToIncident(incidentToForm(i)); expect(converted.errors).toEqual([]);
    const file = exportIncident(converted.incident!); const loaded = parseIncidentFile(file.text, file.text.length);
    expect(loaded.ok).toBe(true); if (loaded.ok) expect(loaded.incident.response).toEqual(i.response);
  });
  it("accepts legacy files and rejects missing or unexpected response data", () => {
    expect(validateIncident(baseIncident()).ok).toBe(true);
    expect(validateIncident({ ...baseIncident(), schemaVersion: 2 }).ok).toBe(false);
    const i = record();
    expect(validateIncident({ ...i, response: { ...i.response, principalNames: [] } }).ok).toBe(false);
    expect(validateIncident({ ...i, response: { ...i.response, childrenCount: -1 } }).ok).toBe(false);
    expect(validateIncident({ ...i, response: { ...i.response, reviewedAt: "2026-10-24T10:00:00" } }).ok).toBe(false);
    expect(validateIncident({ ...i, schemaVersion: 3 }).ok).toBe(false);
  });
  it("identifies contradictions without changing recorded facts", () => {
    const i = record(); i.response.containment = "contained"; i.response.accessActive = "yes";
    i.affectedPrincipals.identified = 200;
    const before = JSON.stringify(i); const a = responseAssessment(i, now);
    expect(a.issues.map(x => x.path)).toContain("response.containment");
    expect(a.issues.map(x => x.path)).toContain("affectedPrincipals.identified");
    expect(JSON.stringify(i)).toBe(before);
  });
  it("surfaces guardian and joint-fiduciary questions in individual drafts and the response pack", () => {
    const i = record(); i.response.childrenCount = 3; i.response.jointFiduciaries = "yes";
    const draft = generateDataPrincipalNotice(i);
    expect(draft.ambiguities.map(a => a.id)).toEqual(expect.arrayContaining(["AMB-19", "AMB-20"]));
    const board = generateBoardReports(i);
    for (const report of [board.initial, board.detailed]) expect(report.ambiguities.map(a => a.id)).toEqual(expect.arrayContaining(["AMB-19", "AMB-20"]));
    const pack = responsePack(i, now);
    expect(pack).toContain("AMB-19"); expect(pack).toContain("AMB-20");
    expect(pack).toContain("ACTION REGISTER"); expect(pack).toContain("INTERNAL SUMMARY");
    expect(pack).toContain("Clock basis: not selected");
  });
  it("practice includes all six scenarios, advances a virtual clock and labels drafts", () => {
    expect(scenarios).toHaveLength(6);
    for (const s of scenarios) {
      expect(s.injects.length).toBeGreaterThan(2); expect(s.injects[0]?.hours).toBe(0);
      expect(s.injects.at(-1)?.hours).toBe(72);
      const i = record(); i.response.practice = { scenario: s.id, step: s.injects.length - 1, startedAt: now };
      expect(Date.parse(practiceNow(i.response)) - Date.parse(now)).toBe(72 * 3_600_000);
      expect(generateDataPrincipalNotice(i).text).toContain("FICTIONAL PRACTICE");
      expect(responsePack(i, practiceNow(i.response))).toContain("PRACTICE DEBRIEF");
    }
  });
});
