import schema from "./incident.schema.json";
import { parseIsoWithOffset } from "./time";
import type { Incident } from "./types";

/**
 * Validates an unknown value against incident.schema.json.
 *
 * Interprets only the keywords the schema uses (type, const, enum, properties, required,
 * additionalProperties:false, items, minLength, minimum, pattern, $ref to #/$defs,
 * format "date-time"). Driving validation from the schema keeps the two from drifting
 * without adding a validator dependency. "date-time" is also checked for a real calendar
 * instant, which a pattern alone cannot do.
 */

type Node = Record<string, unknown>;

export type ValidationResult =
  | { ok: true; incident: Incident }
  | { ok: false; errors: string[] };

const root = schema as unknown as Node;

function resolve(node: Node): Node {
  const ref = node["$ref"];
  if (typeof ref !== "string") return node;
  const prefix = "#/$defs/";
  if (!ref.startsWith(prefix)) throw new Error(`unsupported $ref ${ref}`);
  const defs = root["$defs"] as Record<string, Node>;
  const target = defs[ref.slice(prefix.length)];
  if (!target) throw new Error(`unresolved $ref ${ref}`);
  return target;
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number" && Number.isInteger(value)) return "integer";
  return typeof value;
}

function typeMatches(value: unknown, expected: string): boolean {
  const actual = typeOf(value);
  return actual === expected || (expected === "number" && actual === "integer");
}

function check(value: unknown, rawNode: Node, path: string, errors: string[]): void {
  const node = resolve(rawNode);

  if ("const" in node && value !== node["const"]) {
    errors.push(`${path}: must equal ${JSON.stringify(node["const"])}`);
    return;
  }
  const allowed = node["enum"];
  if (Array.isArray(allowed) && !allowed.includes(value)) {
    errors.push(`${path}: must be one of ${JSON.stringify(allowed)}`);
    return;
  }
  const type = node["type"];
  if (type !== undefined) {
    const types = Array.isArray(type) ? (type as string[]) : [type as string];
    if (!types.some((t) => typeMatches(value, t))) {
      errors.push(`${path}: expected ${types.join(" | ")}, got ${typeOf(value)}`);
      return;
    }
  }

  if (typeof value === "string") {
    const minLength = node["minLength"];
    if (typeof minLength === "number" && value.length < minLength) {
      errors.push(`${path}: must not be empty`);
    }
    const pattern = node["pattern"];
    if (typeof pattern === "string" && !new RegExp(pattern).test(value)) {
      errors.push(`${path}: must be ISO-8601 with seconds and an explicit offset`);
      return;
    }
    if (node["format"] === "date-time") {
      const parsed = parseIsoWithOffset(value);
      if (!parsed.ok) errors.push(`${path}: ${parsed.error}`);
    }
  }

  if (typeof value === "number") {
    const minimum = node["minimum"];
    if (typeof minimum === "number" && value < minimum) errors.push(`${path}: must be >= ${minimum}`);
  }

  if (Array.isArray(value)) {
    const items = node["items"];
    if (items && typeof items === "object") {
      value.forEach((item, i) => check(item, items as Node, `${path}[${i}]`, errors));
    }
  }

  if (typeOf(value) === "object") {
    const obj = value as Record<string, unknown>;
    const props = (node["properties"] ?? {}) as Record<string, Node>;
    // Own-property checks only: inherited names such as "constructor" or "__proto__" must
    // neither satisfy "required" nor resolve to a schema through Object.prototype.
    for (const key of (node["required"] ?? []) as string[]) {
      if (!Object.hasOwn(obj, key)) errors.push(`${path}.${key}: is required`);
    }
    for (const [key, child] of Object.entries(obj)) {
      const childSchema = Object.hasOwn(props, key) ? props[key] : undefined;
      if (childSchema) check(child, childSchema, `${path}.${key}`, errors);
      else if (node["additionalProperties"] === false) errors.push(`${path}.${key}: is not allowed`);
    }
  }
}

export function validateIncident(input: unknown): ValidationResult {
  const errors: string[] = [];
  check(input, root, "$", errors);
  return errors.length === 0 ? { ok: true, incident: input as Incident } : { ok: false, errors };
}

export { schema as incidentSchema };
