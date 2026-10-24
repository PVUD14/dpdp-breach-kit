import type { AmbiguityId, Interpretation, RequirementId } from "../core/ambiguities";
import { evaluateBreachChecklist } from "../core/checklist";
import { toEpochMs, toIstDisplay } from "../core/time";
import type { Incident, IsoDateTime } from "../core/types";
import { AMBIGUITY_SUMMARIES } from "./ambiguitySummaries";

export const DRAFT_HEADER = "DRAFT AID — NOT LEGAL ADVICE";
export const NOT_PROVIDED = "[NOT PROVIDED]";

export type DraftKind = "data_principal_notice" | "board_initial" | "board_detailed";

/**
 * One line of a section: either a value taken from the incident, or a fact the incident
 * does not record. Labels are fixed template text; values are never synthesised.
 */
export interface Field {
  /** Incident path, matching the names used by evaluateContentCompleteness. */
  field: string;
  label: string;
  /** null = not recorded; rendered as NOT_PROVIDED and listed in missingFields. */
  value: string[] | null;
}

export interface DraftSection {
  requirementId: RequirementId;
  citation: string;
  heading: string;
  body: string[];
  missingFields: string[];
}

export interface AppliedAmbiguity {
  id: AmbiguityId;
  reason: string;
  /** What the core functions did about it for this incident, if anything. */
  applied: string[];
}

export interface Draft {
  kind: DraftKind;
  text: string;
  sections: DraftSection[];
  /** Missing facts across preamble and sections, in order of appearance. */
  missingFields: string[];
  ambiguities: AppliedAmbiguity[];
  interpretation: Interpretation[];
}

// Value helpers. Each returns null when the incident does not record the fact.

export function text(v: string | null): string[] | null {
  return v !== null && v.trim().length > 0 ? [v] : null;
}

export function instant(v: IsoDateTime | null): string[] | null {
  return v === null ? null : [toIstDisplay(toEpochMs(v))];
}

/** For "if any" items: [] is recorded as none, null is not recorded. */
export function listIfAny(v: string[] | null): string[] | null {
  if (v === null) return null;
  return v.length ? v.map((x) => `- ${x}`) : ["None recorded."];
}

/** For items without "if any": an empty list is treated as not provided. */
export function listRequired(v: string[] | null): string[] | null {
  return v !== null && v.length > 0 ? v.map((x) => `- ${x}`) : null;
}

export function renderFields(fields: Field[]): { body: string[]; missingFields: string[] } {
  const body: string[] = [];
  const missingFields: string[] = [];
  for (const f of fields) {
    if (f.value === null) {
      missingFields.push(f.field);
      body.push(`${f.label}: ${NOT_PROVIDED}`);
    } else if (f.value.length === 1 && !f.value[0]!.startsWith("- ")) {
      body.push(`${f.label}: ${f.value[0]}`);
    } else {
      body.push(`${f.label}:`, ...f.value.map((v) => `  ${v}`));
    }
  }
  return { body, missingFields };
}

export function section(requirementId: RequirementId, citation: string, heading: string, fields: Field[]): DraftSection {
  return { requirementId, citation, heading, ...renderFields(fields) };
}

/** Lines stating the Act s.2(u) / s.17(1) checklist result, from evaluateBreachChecklist. */
export function determinationLines(incident: Incident): { lines: string[]; interpretation: Interpretation[] } {
  const c = evaluateBreachChecklist(incident);
  const lines = [`Breach checklist (Act s.2(u), s.17(1)): definition = ${c.definition}; intimation = ${c.intimation}.`];
  if (c.intimation !== "required") {
    lines.push("WARNING: the checklist does not report intimation as required — resolve before sending.");
  }
  if (c.missingFacts.length) lines.push(`Checklist facts not recorded: ${c.missingFacts.join(", ")}.`);
  const r = incident.response;
  if (r) {
    if (r.practice) lines.unshift("FICTIONAL PRACTICE — DO NOT SEND");
    if ((r.childrenCount ?? 0) > 0 || (r.disabilityCount ?? 0) > 0 || r.guardianRecipients !== "unknown") c.interpretation.push({
      ambiguityId: "AMB-19", requirementIds: ["BR-DP-01"],
      choice: "Flagged recipient and channel questions for human review; no recipient was chosen.",
      alternatives: ["Notice to the affected person", "Notice to parent or lawful guardian", "Notice to both"]
    });
    if (r.jointFiduciaries === "yes") c.interpretation.push({
      ambiguityId: "AMB-20", requirementIds: ["BR-GEN-01"],
      choice: "Flagged joint-fiduciary responsibility for human review; no sender was chosen.",
      alternatives: ["Separate notices", "Coordinated notice, subject to legal review"]
    });
  }
  return { lines, interpretation: c.interpretation };
}

export function applyAmbiguities(always: AmbiguityId[], interpretations: Interpretation[]): AppliedAmbiguity[] {
  const byId = new Map<AmbiguityId, AppliedAmbiguity>();
  const add = (id: AmbiguityId) => {
    let entry = byId.get(id);
    if (!entry) {
      entry = { id, reason: AMBIGUITY_SUMMARIES[id], applied: [] };
      byId.set(id, entry);
    }
    return entry;
  };
  always.forEach(add);
  for (const i of interpretations) {
    const entry = add(i.ambiguityId);
    if (!entry.applied.includes(i.choice)) entry.applied.push(i.choice);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

const PLAIN_LANGUAGE_CHECKLIST = [
  "Concise: each section says only what the reader needs; no repetition.",
  "Clear: no unexplained legal, technical or internal terms (incident IDs, system names, acronyms).",
  "Plain: short sentences, active voice, a stated subject for every action.",
  "Factual: every statement comes from the incident record; nothing added or speculated.",
  `Every ${NOT_PROVIDED} placeholder is resolved, or deliberately left with a recorded reason.`,
  `The "${DRAFT_HEADER}" header, requirement IDs, rule citations and this checklist are removed before sending.`,
];

export function renderDraft(args: {
  kind: DraftKind;
  title: string;
  preamble: Field[];
  preambleNotes: string[];
  sections: DraftSection[];
  ambiguities: AppliedAmbiguity[];
  interpretation: Interpretation[];
  extraReview: string[];
}): Draft {
  const pre = renderFields(args.preamble);
  const lines: string[] = [DRAFT_HEADER, "", args.title, ...pre.body, ...args.preambleNotes];

  args.sections.forEach((s, n) => {
    lines.push("", `${n + 1}. ${s.heading} [${s.requirementId} · ${s.citation}]`, ...s.body.map((b) => `   ${b}`));
  });

  lines.push("", "AMBIGUITIES THAT APPLY (docs/requirements.md §5)");
  for (const a of args.ambiguities) {
    lines.push(`- ${a.id}: ${a.reason}`);
    for (const applied of a.applied) lines.push(`    Applied here: ${applied}`);
  }

  lines.push("", "HUMAN REVIEW CHECKLIST — PLAIN LANGUAGE (BR-DP-03: \"concise, clear and plain manner\")");
  for (const item of [...PLAIN_LANGUAGE_CHECKLIST, ...args.extraReview]) lines.push(`[ ] ${item}`);

  return {
    kind: args.kind,
    text: lines.join("\n") + "\n",
    sections: args.sections,
    missingFields: [...pre.missingFields, ...args.sections.flatMap((s) => s.missingFields)],
    ambiguities: args.ambiguities,
    interpretation: args.interpretation,
  };
}
