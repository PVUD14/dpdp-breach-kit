import { describe, expect, it } from "vitest";
import requirements from "../docs/requirements.md?raw";
import sourcesMd from "../docs/source/SOURCES.md?raw";
import { evaluateSources, parseSourcesTable } from "../scripts/verify-sources-lib.mjs";

const rows = parseSourcesTable(requirements);
const allPresent = () => new Map(rows.map((r) => [r.file, r.sha256]));

describe("parseSourcesTable", () => {
  it("reads the four recorded sources from docs/requirements.md §1", () => {
    expect(rows.map((r) => r.file)).toEqual([
      "dpdp_rules_2025.pdf",
      "dpdp_rules_2025_corrigendum.pdf",
      "dpdp_act_2023.pdf",
      "dpdp_act_commencement_gsr843.pdf",
    ]);
    for (const r of rows) {
      expect(r.url).toMatch(/^https:\/\/www\.meity\.gov\.in\/static\/uploads\/.+\.pdf$/);
      expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("rejects a table with no rows or a malformed hash", () => {
    expect(() => parseSourcesTable("# nothing here")).toThrow(/no "## 1. Sources"/);
    expect(() => parseSourcesTable("## 1. Sources\n\nno rows\n")).toThrow(/no file\/SHA-256 rows/);
    expect(() => parseSourcesTable("## 1. Sources\n| `a.pdf` | d | i | u | t | 1 | `xyz` |\n")).toThrow(/bad SHA-256/);
  });
});

describe("docs/source/SOURCES.md", () => {
  it("lists exactly the same documents and values as docs/requirements.md §1", () => {
    const fromSources = sourcesMd
      .split(/\r?\n/)
      .filter((l) => l.startsWith("| `"))
      .map((l) => l.split("|").slice(1, -1).map((c) => c.trim().replace(/`/g, "")));
    expect(fromSources).toEqual(rows.map((r) => [r.file, r.document, r.identifier, r.url, r.downloaded, r.pages, r.sha256]));
  });
});

describe("evaluateSources", () => {
  it("absent: exits 2 with 'sources not downloaded', each URL and expected hash", () => {
    const r = evaluateSources(rows, new Map());
    expect(r.code).toBe(2);
    const out = r.lines.join("\n");
    expect(out).toContain("sources not downloaded");
    for (const row of rows) {
      expect(out).toContain(row.url);
      expect(out).toContain(row.sha256);
    }
  });

  it("partly absent with no mismatch: exits 2 and lists only the missing files", () => {
    const present = allPresent();
    present.delete("dpdp_act_2023.pdf");
    const r = evaluateSources(rows, present);
    expect(r.code).toBe(2);
    expect(r.lines.filter((l) => l.startsWith("MISSING"))).toEqual(["MISSING  dpdp_act_2023.pdf"]);
    expect(r.lines.filter((l) => l.startsWith("PASS"))).toHaveLength(3);
  });

  it("mismatch: exits 1 and shows recorded and actual hashes", () => {
    const present = allPresent();
    present.set("dpdp_rules_2025_corrigendum.pdf", "0".repeat(64));
    const r = evaluateSources(rows, present);
    expect(r.code).toBe(1);
    expect(r.lines).toContain("FAIL  dpdp_rules_2025_corrigendum.pdf: MISMATCH");
    expect(r.lines).toContain(`      actual   ${"0".repeat(64)}`);
  });

  it("a mismatch outranks missing files: exits 1, not 2", () => {
    const present = new Map([["dpdp_rules_2025.pdf", "f".repeat(64)]]);
    const r = evaluateSources(rows, present);
    expect(r.code).toBe(1);
    expect(r.lines.join("\n")).not.toContain("sources not downloaded");
  });

  it("an unrecorded PDF fails: exits 1", () => {
    const present = allPresent();
    present.set("extra.pdf", "a".repeat(64));
    expect(evaluateSources(rows, present).code).toBe(1);
  });

  it("match: exits 0 with every file PASS", () => {
    const r = evaluateSources(rows, allPresent());
    expect(r.code).toBe(0);
    expect(r.lines.filter((l) => l.startsWith("PASS"))).toHaveLength(4);
    expect(r.lines.join("\n")).not.toMatch(/MISSING|FAIL/);
  });
});
