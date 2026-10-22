import { describe, expect, it } from "vitest";
import { incidentSchema, validateIncident } from "../src/core/validate";
import { baseIncident, withChanges } from "./fixtures";

type SchemaNode = { properties?: Record<string, SchemaNode>; $ref?: string; items?: SchemaNode };

/** Collects dotted property paths from the schema (objects only; array items as "[]"). */
function schemaPaths(node: SchemaNode, prefix = ""): string[] {
  const out: string[] = [];
  for (const [key, child] of Object.entries(node.properties ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    out.push(path);
    out.push(...schemaPaths(child, path));
    if (child.items?.properties) out.push(...schemaPaths(child.items, `${path}[]`));
  }
  return out;
}

function valuePaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.length ? valuePaths(value[0], `${prefix}[]`) : [];
  const out: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    out.push(path);
    out.push(...valuePaths(child, path));
  }
  return out;
}

describe("incident schema", () => {
  it("accepts the synthetic fixture", () => {
    expect(validateIncident(baseIncident())).toEqual({ ok: true, incident: baseIncident() });
  });

  it("matches the TypeScript Incident shape field-for-field", () => {
    const full = withChanges((i) => {
      i.classification.exemptionClaims = [{ clause: "a", basis: "x" }];
      i.noticesSent = [{ kind: "dp_intimation", sentAt: "2026-10-20T10:00:00+05:30", recipientCount: 1, channel: "user_account" }];
    });
    const fromSchema = schemaPaths(incidentSchema as SchemaNode).sort();
    expect(valuePaths(full).sort()).toEqual(fromSchema);
  });

  it("reports missing facts as nulls, not omissions", () => {
    const missing = baseIncident() as unknown as Record<string, unknown>;
    delete missing["awareness"];
    const r = validateIncident(missing);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("$.awareness: is required");
  });

  it("rejects timestamps without offset or seconds, and impossible dates", () => {
    for (const bad of ["2026-10-20T09:00:00", "2026-10-20T09:00+05:30", "2026-02-30T09:00:00+05:30"]) {
      const r = validateIncident(withChanges((i) => (i.awareness.fiduciaryAwareAt = bad)));
      expect(r.ok, bad).toBe(false);
    }
  });

  it("rejects unknown properties and negative counts", () => {
    const extra = { ...baseIncident(), principalNames: ["x"] };
    expect(validateIncident(extra).ok).toBe(false);
    expect(validateIncident(withChanges((i) => (i.affectedPrincipals.identified = -1))).ok).toBe(false);
    expect(validateIncident(withChanges((i) => (i.affectedPrincipals.identified = 1.5))).ok).toBe(false);
  });
});

describe("own-property field checks (regression)", () => {
  const RESERVED = ["__proto__", "constructor", "toString", "hasOwnProperty"];

  /** Adds `name` as an own, enumerable key — even "__proto__", which plain assignment would not. */
  function withOwnKey(target: object, name: string, value: unknown): void {
    Object.defineProperty(target, name, { value, enumerable: true, configurable: true, writable: true });
  }

  function errorsOf(input: unknown): string[] {
    const r = validateIncident(input);
    return r.ok ? [] : r.errors;
  }

  it.each(RESERVED)("rejects own key %s as unknown at the top level, nested and inside array items", (name) => {
    const top = baseIncident();
    withOwnKey(top, name, "x");
    expect(errorsOf(top)).toEqual([`$.${name}: is not allowed`]);

    const nested = baseIncident();
    withOwnKey(nested.awareness, name, "x");
    expect(errorsOf(nested)).toEqual([`$.awareness.${name}: is not allowed`]);

    const inItem = withChanges((i) => {
      i.noticesSent = [{ kind: "dp_intimation", sentAt: "2026-10-20T12:00:00+05:30", recipientCount: 1, channel: null }];
    });
    withOwnKey(inItem.noticesSent[0]!, name, "x");
    expect(errorsOf(inItem)).toEqual([`$.noticesSent[0].${name}: is not allowed`]);
  });

  it('rejects a JSON-parsed object with "__proto__" as an own key', () => {
    const text = JSON.stringify(baseIncident()).replace(/^\{/, '{"__proto__":{"polluted":true},');
    const parsed: unknown = JSON.parse(text);
    expect(Object.hasOwn(parsed as object, "__proto__")).toBe(true);
    expect(errorsOf(parsed)).toEqual(["$.__proto__: is not allowed"]);
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("does not accept a required field that is only inherited through the prototype", () => {
    const { awareness, ...rest } = baseIncident();
    const inherited = Object.assign(Object.create({ awareness }) as object, rest);
    expect(errorsOf(inherited)).toEqual(["$.awareness: is required"]);
  });

  it("still accepts the ordinary fixture", () => {
    expect(validateIncident(baseIncident()).ok).toBe(true);
  });
});
