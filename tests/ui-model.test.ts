import { describe, expect, it } from "vitest";
import { evaluateBreachChecklist } from "../src/core/checklist";
import type { Incident } from "../src/core/types";
import { incidentSchema } from "../src/core/validate";
import { generateBoardReports, generateDataPrincipalNotice } from "../src/generators";
import {
  ALL_FIELDS,
  BASIS_OPTIONS,
  GROUPS,
  MAX_IMPORT_BYTES,
  PLAIN_QUESTIONS,
  REPEATS,
  checklistPanel,
  commencementHeadline,
  commencementPanel,
  deadlinePanel,
  draftTabs,
  elapsedPanel,
  emptyFormState,
  emptyRow,
  exportIncident,
  formToIncident,
  incidentToForm,
  isoToLocalIst,
  labelForPath,
  localIstToIso,
  parseIncidentFile,
  progressOf,
  safeFilename,
  type FormState,
} from "../src/ui/model";
import { baseIncident, minimalIncident, withChanges } from "./fixtures";

/** An incident that uses every part of the schema, with +05:30 second-precision timestamps. */
function fullIncident(): Incident {
  return withChanges((i) => {
    i.awareness.processorInvolved = true;
    i.awareness.processorAwareAt = "2026-10-19T21:00:00+05:30";
    i.awareness.processorNotifiedFiduciaryAt = "2026-10-20T08:30:15+05:30";
    i.classification.eventTypes = ["unauthorised_processing", "accidental_disclosure"];
    i.classification.exemptionClaims = [{ clause: "c", basis: "Synthetic basis" }];
    i.dataCategories = ["contact_details", "order_history"];
    i.mitigation.proposed = [];
    i.noticesSent = [
      { kind: "dp_intimation", sentAt: "2026-10-20T12:00:00+05:30", recipientCount: 80, channel: "user_account" },
      { kind: "board_initial", sentAt: "2026-10-20T10:00:00+05:30", recipientCount: null, channel: null },
    ];
    i.extension = { requestedAt: "2026-10-22T09:00:00+05:30", grantedUntil: "2026-10-27T18:00:00+05:30" };
  });
}

function stateWith(mutate: (s: FormState) => void): FormState {
  const s = incidentToForm(baseIncident());
  mutate(s);
  return s;
}

type SchemaNode = { properties?: Record<string, SchemaNode>; items?: SchemaNode };

function schemaLeaves(node: SchemaNode, prefix = ""): string[] {
  return Object.entries(node.properties ?? {}).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child.properties) return schemaLeaves(child, path);
    if (child.items?.properties) return schemaLeaves(child.items, `${path}[]`);
    return [path];
  });
}

describe("form specification", () => {
  it("covers every leaf of incident.schema.json exactly once", () => {
    const fromForm = [
      "schemaVersion",
      ...ALL_FIELDS.map((f) => f.path),
      ...REPEATS.flatMap((r) => r.row.map((f) => `${r.path}[].${f.key}`)),
    ].sort();
    expect(fromForm).toEqual(schemaLeaves(incidentSchema as SchemaNode).sort());
  });

  it("marks every fact the checklist or drafts report as missing", () => {
    const m = minimalIncident();
    const board = generateBoardReports(m);
    const missing = new Set([
      ...evaluateBreachChecklist(m).missingFacts,
      ...generateDataPrincipalNotice(m).missingFields,
      ...board.initial.missingFields,
      ...board.detailed.missingFields,
    ]);
    const marked = [
      ...ALL_FIELDS.filter((f) => f.neededFor.length).map((f) => f.path),
      ...REPEATS.filter((r) => r.neededFor.length).map((r) => r.path),
    ];
    for (const name of missing) {
      const base = name.replace(/\[.*$/, "");
      expect(marked.some((p) => p === base || p.startsWith(`${base}.`)), name).toBe(true);
    }
  });
});

describe("form ⇄ incident", () => {
  it("an empty form needs only an incident reference to give the minimal incident", () => {
    const empty = formToIncident(emptyFormState());
    expect(empty.incident).toBeNull();
    expect(empty.errors).toEqual([{ path: "incidentId", message: "Please fill this in." }]);

    const s = emptyFormState();
    s.values["incidentId"] = "INC-TEST-MIN";
    expect(formToIncident(s)).toEqual({ incident: minimalIncident(), errors: [] });
  });

  it("round-trips every field through the form", () => {
    for (const incident of [fullIncident(), baseIncident(), minimalIncident()]) {
      expect(formToIncident(incidentToForm(incident))).toEqual({ incident, errors: [] });
    }
  });

  it("re-expresses other offsets in IST without changing the instant", () => {
    const zulu = withChanges((i) => (i.awareness.fiduciaryAwareAt = "2026-10-20T03:30:00Z"));
    const back = formToIncident(incidentToForm(zulu)).incident;
    expect(back?.awareness.fiduciaryAwareAt).toBe("2026-10-20T09:00:00+05:30");
  });

  it("keeps whole seconds and drops sub-second fractions when a record goes through the form", () => {
    const precise = withChanges((i) => (i.awareness.fiduciaryAwareAt = "2026-10-20T09:00:07.789+05:30"));
    expect(formToIncident(incidentToForm(precise)).incident?.awareness.fiduciaryAwareAt).toBe("2026-10-20T09:00:07+05:30");
  });

  it("converts datetime-local input as IST", () => {
    expect(localIstToIso("2026-10-20T09:00")).toBe("2026-10-20T09:00:00+05:30");
    expect(localIstToIso("2026-10-20T09:00:05")).toBe("2026-10-20T09:00:05+05:30");
    expect(localIstToIso("2026-02-30T09:00")).toBeNull();
    expect(localIstToIso("2026-10-20 09:00")).toBeNull();
    expect(isoToLocalIst("2026-10-20T03:30:00Z")).toBe("2026-10-20T09:00:00");
  });

  it("rejects malformed counts and dates with field-level errors", () => {
    const r = formToIncident(
      stateWith((s) => {
        s.values["affectedPrincipals.identified"] = "12a";
        s.values["affectedPrincipals.estimatedTotal"] = "-1";
        s.values["description.occurredAt"] = "2026-13-01T00:00";
      }),
    );
    expect(r.incident).toBeNull();
    expect(r.errors.map((e) => e.path)).toEqual([
      "description.occurredAt",
      "affectedPrincipals.estimatedTotal",
      "affectedPrincipals.identified",
    ]);
  });

  it("distinguishes not recorded, recorded as none, and a contradiction", () => {
    const path = "mitigation.remedialMeasuresAgainstRecurrence";
    const notRecorded = formToIncident(stateWith((s) => (s.values[path] = ""))).incident;
    expect(notRecorded?.mitigation.remedialMeasuresAgainstRecurrence).toBeNull();
    const none = formToIncident(stateWith((s) => ((s.values[path] = ""), (s.none[path] = true)))).incident;
    expect(none?.mitigation.remedialMeasuresAgainstRecurrence).toEqual([]);
    const both = formToIncident(stateWith((s) => ((s.values[path] = "x"), (s.none[path] = true))));
    expect(both.errors).toEqual([{ path, message: 'You ticked "None" but also listed items. Clear one of them.' }]);
  });

  it("requires the kind and time of each notice row and the clause and basis of each claim", () => {
    const r = formToIncident(
      stateWith((s) => {
        s.rows.noticesSent.push(emptyRow(REPEATS[1]!));
        s.rows["classification.exemptionClaims"].push(emptyRow(REPEATS[0]!));
      }),
    );
    expect(r.errors.map((e) => labelForPath(e.path))).toEqual([
      "Exemption 1: Which exemption",
      "Exemption 1: Why it may apply",
      "Notice 1: Who it went to",
      "Notice 1: When it was sent (IST)",
    ]);
  });
});

describe("import / export", () => {
  const good = exportIncident(fullIncident());

  it("exports JSON that imports back to the same record", () => {
    expect(good.filename).toBe("INC-TEST-0001.incident.json");
    expect(parseIncidentFile(good.text, good.text.length)).toEqual({ ok: true, incident: fullIncident() });
  });

  it("rejects invalid JSON, oversize files and non-objects", () => {
    expect(parseIncidentFile("{", 1)).toEqual({ ok: false, errors: ["This file can't be read. Choose a file saved from this page (.json)."] });
    expect(parseIncidentFile(good.text, MAX_IMPORT_BYTES + 1).ok).toBe(false);
    expect(parseIncidentFile("[]", 2).ok).toBe(false);
    expect(parseIncidentFile("null", 4).ok).toBe(false);
  });

  it("rejects unknown fields at any depth", () => {
    const top = { ...fullIncident(), principalNames: ["x"] };
    const nested = withChanges((i) => Object.assign(i.affectedPrincipals, { emails: 3 }));
    const inRow = withChanges((i) => {
      i.noticesSent = [{ kind: "dp_intimation", sentAt: "2026-10-20T12:00:00+05:30", recipientCount: 1, channel: null, to: "x" } as never];
    });
    for (const [name, value] of [["top", top], ["nested", nested], ["row", inRow]] as const) {
      const text = JSON.stringify(value);
      const r = parseIncidentFile(text, text.length);
      expect(r.ok, name).toBe(false);
      if (!r.ok) expect(r.errors.join(" "), name).toMatch(/is not allowed/);
    }
  });

  it("rejects Object.prototype keys as unknown fields, at any depth", () => {
    const body = good.text.trim().slice(1);
    const cases = [
      '{"__proto__":{"polluted":true},' + body,
      '{"constructor":1,' + body,
      good.text.replace('"awareness": {', '"awareness": {"toString": "x",'),
    ];
    for (const text of cases) {
      const r = parseIncidentFile(text, text.length);
      expect(r.ok, text.slice(0, 40)).toBe(false);
      if (!r.ok) expect(r.errors[0]).toMatch(/is not allowed$/);
    }
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("makes safe file names", () => {
    expect(safeFilename("../../etc/passwd")).toBe("etc_passwd");
    expect(safeFilename("<script>alert(1)</script>")).toBe("script_alert_1_script_");
    expect(safeFilename("")).toBe("incident");
    expect(safeFilename("a".repeat(200))).toHaveLength(80);
  });
});

describe("panels", () => {
  const incident = baseIncident(); // aware 2026-10-20T09:00:00+05:30

  it("checklist reports the outcome and interpretations", () => {
    const p = checklistPanel(incident);
    expect(p.summary).toBe("Based on your answers, this fits the law's definition of a data breach, so notices are needed. Check with your adviser.");
    expect(p.notes.some((n) => n.startsWith("AMB-05:"))).toBe(true);
  });

  it("deadline and elapsed panels wait for an explicit basis", () => {
    for (const p of [deadlinePanel(incident, "", "2026-10-21T09:00:00+05:30"), elapsedPanel(incident, "", "2026-10-21T09:00:00+05:30")]) {
      expect(p.summary).toMatch(/so there is no default/);
      expect(p.lines).toEqual([]);
    }
  });

  it("deadline panel shows remaining time, the boundary and the passed state", () => {
    expect(deadlinePanel(incident, "fiduciary", "2026-10-21T09:00:00+05:30").summary).toBe("2 days 0 hours left.");
    expect(deadlinePanel(incident, "fiduciary", "2026-10-23T09:00:00+05:30").summary).toBe("This is exactly the deadline. The law doesn't say whether that counts as on time.");
    expect(deadlinePanel(incident, "fiduciary", "2026-10-23T10:30:00+05:30").summary).toBe("The deadline passed 1h 30m 0s ago.");
    expect(deadlinePanel(incident, "processor", "2026-10-21T09:00:00+05:30").summary).toBe("Fill in: When the vendor found out.");
  });

  it("elapsed panel measures from awareness with no threshold", () => {
    const p = elapsedPanel(incident, "fiduciary", "2026-10-20T11:30:00+05:30");
    expect(p.summary).toMatch(/^2h 30m 0s since you found out. .*no exact time limit/);
    expect(p.lines[0]).toEqual({ label: "Notice to affected people", value: "Not sent yet — 2h 30m 0s so far" });
  });

  it("elapsed panel says plainly when the awareness time is in the future, with no negative durations", () => {
    const p = elapsedPanel(incident, "fiduciary", "2026-10-20T08:00:00+05:30");
    expect(p.summary).toBe("The time you entered is 1h 0m 0s in the future. Check the date — or this is a practice record.");
    expect(JSON.stringify(p)).not.toMatch(/-\d+h/);
  });

  it("commencement headline names the computed date and AMB-14", () => {
    expect(commencementHeadline("2026-10-22T12:00:00+05:30")).toEqual({
      text: "Rule 7 starts on 13 May 2027 by our calculation — the Rules don't give an exact date.",
      reached: false,
    });
    expect(commencementHeadline("2027-05-13T00:00:00+05:30").reached).toBe(true);
  });

  it("commencement panel states the computed date and AMB-14", () => {
    const p = commencementPanel("2026-10-22T12:00:00+05:30");
    expect(p.summary).toContain("13 May 2027");
    expect(p.lines[0]).toEqual({ label: "Today", value: "Rule 7 is not in force yet (on our calculation)" });
    expect(p.notes[0]).toMatch(/^AMB-14:/);
  });
});

describe("progress and deadline ring", () => {
  it("counts answers from none to all", () => {
    const none = progressOf(minimalIncident());
    expect(none.done).toBe(0);
    expect(none.total).toBeGreaterThan(10);
    const all = progressOf(
      withChanges((i) => {
        i.noticesSent = [{ kind: "dp_intimation", sentAt: "2026-10-20T12:00:00+05:30", recipientCount: 100, channel: "user_account" }];
      }),
    );
    expect(all).toEqual({ done: none.total, total: none.total });
    const partial = progressOf(baseIncident());
    expect(partial.done).toBeGreaterThan(0);
    expect(partial.done).toBeLessThan(partial.total);
  });

  it("fills the ring with the share of the 72 hours used, capped at 100%", () => {
    const at = (now: string) => deadlinePanel(baseIncident(), "fiduciary", now).meter;
    expect(at("2026-10-20T09:00:00+05:30")).toEqual({ fraction: 0, caption: "0% of the time used" });
    expect(at("2026-10-21T21:00:00+05:30")).toEqual({ fraction: 0.5, caption: "50% of the time used" });
    expect(at("2026-10-23T09:00:00+05:30")?.fraction).toBe(1);
    expect(at("2026-10-25T09:00:00+05:30")?.fraction).toBe(1);
    expect(at("2026-10-19T09:00:00+05:30")?.fraction).toBe(0);
  });
});

describe("plain language", () => {
  // Legal terms that should not appear in the words people read on the form and panels.
  const JARGON = /Data Principal|Data Fiduciary|Data Processor|intimation|awareness|\bs\.\s?\d|\br\.\s?7|AMB-\d|incident JSON|Not established/i;

  it("keeps form labels, help, options and section titles free of legal jargon", () => {
    const texts = [
      ...GROUPS.flatMap((g) => [g.legend, g.help ?? ""]),
      ...ALL_FIELDS.flatMap((f) => [f.label, f.help ?? "", ...(f.options ?? []).map((o) => o.label)]),
      ...REPEATS.flatMap((r) => [r.legend, r.itemLabel, ...r.row.flatMap((f) => [f.label, ...(f.options ?? []).map((o) => o.label)])]),
      ...BASIS_OPTIONS.map((o) => o.label),
    ];
    for (const t of texts) expect(t, t).not.toMatch(JARGON);
  });

  it("keeps panel titles, summaries and row labels free of legal jargon", () => {
    const incident = withChanges((i) => (i.classification.exemptionClaims = [{ clause: "c", basis: "synthetic" }]));
    const now = "2026-10-21T09:00:00+05:30";
    const panels = [
      checklistPanel(incident),
      checklistPanel(minimalIncident()),
      deadlinePanel(incident, "fiduciary", now),
      deadlinePanel(incident, "processor", now),
      elapsedPanel(incident, "fiduciary", now),
      commencementPanel(now),
    ];
    for (const p of panels) {
      for (const t of [p.title, p.summary, ...p.lines.map((l) => l.label)]) expect(t, t).not.toMatch(JARGON);
    }
  });

  it("has a plain-language question for every documented open legal question", () => {
    for (let n = 1; n <= 20; n++) {
      const id = `AMB-${String(n).padStart(2, "0")}`;
      expect(PLAIN_QUESTIONS[id], id).toMatch(/\?/);
    }
    for (const tab of draftTabs(baseIncident())) {
      for (const a of tab.ambiguities) expect(a.reason).toBe(PLAIN_QUESTIONS[a.id]);
    }
  });
});

describe("draft tabs", () => {
  it("offers the three drafts with safe file names, unchanged from the generators", () => {
    const incident = withChanges((i) => (i.incidentId = "INC/42 <b>"));
    const tabs = draftTabs(incident);
    expect(tabs.map((t) => t.filename)).toEqual([
      "INC_42_b_-data_principal_notice.txt",
      "INC_42_b_-board_initial.txt",
      "INC_42_b_-board_detailed.txt",
    ]);
    expect(tabs[0]!.text).toBe(generateDataPrincipalNotice(incident).text);
    expect(tabs[2]!.text).toBe(generateBoardReports(incident).detailed.text);
    expect(tabs.every((t) => t.ambiguities.length > 0)).toBe(true);
  });
});
