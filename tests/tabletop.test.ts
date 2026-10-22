import { describe, expect, it } from "vitest";
import requirements from "../docs/requirements.md?raw";
import { evaluateBreachChecklist } from "../src/core/checklist";
import { evaluateContentCompleteness } from "../src/core/content";
import { computeBoardReportDeadline } from "../src/core/deadline";
import { validateIncident } from "../src/core/validate";
import { formToIncident, incidentToForm, parseIncidentFile } from "../src/ui/model";

const docs = import.meta.glob<string>("../docs/tabletop/**/*.md", { query: "?raw", import: "default", eager: true });
const examples = import.meta.glob<string>("../docs/tabletop/examples/*.json", { query: "?raw", import: "default", eager: true });

const section4 = requirements.slice(requirements.indexOf("## 4. Requirements"), requirements.indexOf("## 5."));
const section5 = requirements.slice(requirements.indexOf("## 5. Ambiguities"), requirements.indexOf("## 6."));

const base = (p: string) => p.replace(/^.*\//, "").replace(/\.(md|json)$/, "");
const scenarios = Object.entries(docs).filter(([p]) => /\/scenario-\d-[^/]+\.md$/.test(p));
const guide = Object.entries(docs).find(([p]) => p.endsWith("/facilitator-guide.md"))?.[1] ?? "";

function load(name: string) {
  const text = examples[`../docs/tabletop/examples/${name}.json`];
  if (text === undefined) throw new Error(`missing example ${name}`);
  const r = parseIncidentFile(text, new TextEncoder().encode(text).length);
  if (!r.ok) throw new Error(r.errors.join("; "));
  return r.incident;
}

describe("tabletop pack — structure", () => {
  it("has six scenarios, each with a matching example, all listed in the facilitator guide", () => {
    expect(scenarios).toHaveLength(6);
    expect(Object.keys(examples)).toHaveLength(6);
    expect(scenarios.map(([p]) => base(p)).sort()).toEqual(Object.keys(examples).map(base).sort());
    for (const [path, text] of scenarios) {
      const name = base(path);
      expect(text, name).toContain(`examples/${name}.json`);
      expect(guide, name).toContain(`(${name}.md)`);
      expect(guide, name).toContain(`(examples/${name}.json)`);
    }
  });

  it("gives every scenario the required sections, T+0 to T+72h injects and a fictional disclaimer", () => {
    for (const [path, text] of scenarios) {
      for (const heading of [
        "## Background",
        "## Injects",
        "## Decision points",
        "## Discussion prompts",
        "## Obligations exercised",
        "## Ambiguities surfaced (questions, not answers)",
      ]) {
        expect(text, `${base(path)}: ${heading}`).toContain(heading);
      }
      expect(text, base(path)).toMatch(/\| T\+0 /);
      expect(text, base(path)).toMatch(/\| T\+72h /);
      expect(text, base(path)).toMatch(/Fictional exercise\./);
      expect(text, base(path)).toMatch(/not legal advice/);
    }
  });

  it("poses every AMB item as a question with a one-line reason it is unresolved", () => {
    for (const [path, text] of scenarios) {
      const table = text.slice(text.indexOf("## Ambiguities surfaced"), text.indexOf("## Using the example record"));
      const rows = [...table.matchAll(/^\| (AMB-\d{2}) \| (.+?) \| (.+?) \|$/gm)];
      expect(rows.length, base(path)).toBeGreaterThanOrEqual(4);
      for (const [, id, question, why] of rows) {
        expect(question?.trim().endsWith("?"), `${base(path)} ${id}`).toBe(true);
        expect((why ?? "").trim().length, `${base(path)} ${id}`).toBeGreaterThan(10);
      }
    }
  });
});

describe("tabletop pack — traceability to docs/requirements.md", () => {
  const all = [...Object.entries(docs), ...Object.entries(examples)];

  it("cites only BR-* IDs that exist in §4", () => {
    const ids = new Set(all.flatMap(([, t]) => [...t.matchAll(/\bBR-(?:DP|BD|GEN)-\d{2}\b/g)].map((m) => m[0])));
    expect(ids.size).toBeGreaterThan(10);
    for (const id of ids) expect(section4, id).toContain(`| ${id} |`);
  });

  it("surfaces AMB-19 in scenario 4 and AMB-20 in scenario 6 as questions", () => {
    const amb = (name: string, id: string) => {
      const text = scenarios.find(([p]) => base(p) === name)?.[1] ?? "";
      return new RegExp(`^\\| ${id} \\| .+\\? \\| .+ \\|$`, "m").test(text);
    };
    expect(amb("scenario-4-lost-laptop", "AMB-19")).toBe(true);
    expect(amb("scenario-6-third-party-api", "AMB-20")).toBe(true);
    for (const [path, text] of scenarios) expect(text, base(path)).not.toMatch(/does not yet record/);
  });

  it("cites only AMB-* IDs that exist in §5", () => {
    const ids = new Set(all.flatMap(([, t]) => [...t.matchAll(/\bAMB-\d{2}\b/g)].map((m) => m[0])));
    expect(ids.size).toBeGreaterThan(10);
    for (const id of ids) expect(section5, id).toContain(`| ${id} |`);
  });
});

describe("tabletop examples", () => {
  const names = Object.keys(examples).map(base);

  it.each(names)("%s validates and loads through the page's import path", (name) => {
    const incident = load(name);
    expect(validateIncident(incident).ok).toBe(true);
    expect(formToIncident(incidentToForm(incident))).toEqual({ incident, errors: [] });
  });

  it.each(names)("%s contains no email addresses or phone-number-like digit runs", (name) => {
    const text = examples[`../docs/tabletop/examples/${name}.json`] ?? "";
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/\d{10}/);
  });

  // The behaviours each scenario's "Using the example record" section describes.
  it("matches what the scenarios say the page will show", () => {
    expect(load("scenario-1-processor-ransomware").awareness.processorAwareAt).not.toBeNull();
    const s2 = evaluateContentCompleteness(load("scenario-2-storage-bucket"));
    expect(s2.boardInitial.every((i) => i.status === "present")).toBe(true);
    expect(s2.boardDetailed.some((i) => i.status === "missing")).toBe(true);
    expect(evaluateBreachChecklist(load("scenario-3-insider-exfiltration")).intimation).toBe("requires_legal_determination");
    expect(evaluateBreachChecklist(load("scenario-4-lost-laptop")).definition).toBe("indeterminate");
    expect(computeBoardReportDeadline(load("scenario-5-phishing-account-takeover"), { basis: "fiduciary" }).effectiveDeadline?.display).toBe(
      "5 Nov 2027, 09:20:00 IST",
    );
    const s6 = computeBoardReportDeadline(load("scenario-6-third-party-api"), { basis: "fiduciary" });
    expect(s6.extension).toBe("requested_pending");
    expect(s6.interpretation.map((i) => i.ambiguityId)).toContain("AMB-12");
  });
});
