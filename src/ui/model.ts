/**
 * View-model for the intake page. Pure: no DOM, network or storage, so it is unit-tested
 * directly (tests/ui-model.test.ts). src/ui/app.ts only renders what this module returns.
 */
import { evaluateBreachChecklist } from "../core/checklist";
import { commencementBanner } from "../core/commencement";
import { computeBoardReportDeadline, type AwarenessBasis } from "../core/deadline";
import { formatDuration, parseIsoWithOffset, toEpochMs, toIstIso } from "../core/time";
import type { Incident } from "../core/types";
import type { ResponseState } from "../core/response";
import { validateIncident } from "../core/validate";
import { trackWithoutDelay } from "../core/withoutDelay";
import { generateBoardReports } from "../generators/boardReports";
import { generateDataPrincipalNotice } from "../generators/dataPrincipalNotice";
import type { Draft, DraftKind } from "../generators/render";

// ---------------------------------------------------------------- form specification

export type Use = "checklist" | "deadline" | "dp" | "board_initial" | "board_detailed";

export const USE_LABELS: Readonly<Record<Use, string>> = {
  checklist: "breach check",
  deadline: "deadline",
  dp: "notice to people",
  board_initial: "Board first notice",
  board_detailed: "Board report",
};

export type FieldKind =
  | "text" // non-null string
  | "textarea" // string | null
  | "datetime" // ISO with offset | null; entered as IST wall-clock time
  | "tristate" // boolean | null
  | "count" // non-negative integer | null
  | "select" // enum value | null
  | "enumSet" // array of enum values
  | "list" // string[] (one per line)
  | "listNullable"; // string[] | null, with "recorded as none" => []

export interface Option {
  value: string;
  label: string;
}

export interface FieldSpec {
  path: string;
  label: string;
  kind: FieldKind;
  help?: string;
  options?: Option[];
  /** Outputs that report this fact as missing when it is not recorded. */
  neededFor: Use[];
  /** Free text where people might type personal data: the warning is repeated here. */
  freeText?: boolean;
}

export interface GroupSpec {
  id: string;
  legend: string;
  help?: string;
  fields: FieldSpec[];
}

export const TRISTATE: Option[] = [
  { value: "", label: "Not sure yet" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export const EVENT_TYPES: Option[] = [
  { value: "unauthorised_processing", label: "Someone accessed or used the data without permission" },
  { value: "accidental_disclosure", label: "Data was shown or sent to the wrong people by mistake" },
  { value: "accidental_acquisition", label: "Someone got hold of the data by mistake" },
  { value: "accidental_sharing", label: "Data was shared by mistake" },
  { value: "accidental_use", label: "Data was used by mistake" },
  { value: "accidental_alteration", label: "Data was changed by mistake" },
  { value: "accidental_destruction", label: "Data was deleted or destroyed by mistake" },
  { value: "accidental_loss_of_access", label: "Data became unavailable or was lost (for example, locked by ransomware or a lost laptop)" },
];

export const S17_CLAUSES: Option[] = ["a", "b", "c", "d", "e", "f"].map((c) => ({ value: c, label: `Section 17(1)(${c})` }));

export const NOTICE_KINDS: Option[] = [
  { value: "dp_intimation", label: "Affected people" },
  { value: "board_initial", label: "Data Protection Board — first notice" },
  { value: "board_detailed", label: "Data Protection Board — detailed report" },
];

export const NOTICE_CHANNELS: Option[] = [
  { value: "", label: "Not recorded" },
  { value: "user_account", label: "Through their account with you" },
  { value: "registered_mode", label: "Using contact details they gave you" },
  { value: "other", label: "Some other way" },
];

const FINDINGS: Option[] = [
  { value: "", label: "Not filled in yet" },
  { value: "none_yet", label: "Not known yet" },
  { value: "findings_recorded", label: "Yes — we have findings" },
];

const BOARD: Use[] = ["board_initial", "board_detailed"];
const COMPROMISE_HELP = "Answer Yes, No or Not sure yet.";

export const GROUPS: GroupSpec[] = [
  {
    id: "incident",
    legend: "About this incident",
    fields: [
      {
        path: "incidentId",
        label: "Your reference for this incident",
        kind: "text",
        help: "For example INC-2027-004. Don't use anyone's name.",
        neededFor: ["checklist", "dp", "board_initial", "board_detailed"],
        freeText: true,
      },
    ],
  },
  {
    id: "awareness",
    legend: "When you found out",
    help: "Enter times in Indian Standard Time (IST).",
    fields: [
      { path: "awareness.fiduciaryAwareAt", label: "When your organisation found out", kind: "datetime", neededFor: ["deadline", ...BOARD] },
      {
        path: "awareness.processorInvolved",
        label: "Was a vendor or service provider involved?",
        kind: "tristate",
        options: TRISTATE,
        help: "For example, a cloud host or outsourced IT company that handles the data for you.",
        neededFor: [],
      },
      { path: "awareness.processorAwareAt", label: "When the vendor found out", kind: "datetime", neededFor: [] },
      { path: "awareness.processorNotifiedFiduciaryAt", label: "When the vendor told you", kind: "datetime", neededFor: [] },
    ],
  },
  {
    id: "classification",
    legend: "Is this a data breach?",
    help: "Your answers are compared with the law's definition of a data breach.",
    fields: [
      {
        path: "classification.involvesPersonalData",
        label: "Is it information about people who can be identified?",
        kind: "tristate",
        options: TRISTATE,
        help: "For example customers, patients, students or employees.",
        neededFor: ["checklist"],
      },
      { path: "classification.eventTypes", label: "What happened? Tick all that apply.", kind: "enumSet", options: EVENT_TYPES, neededFor: ["checklist"] },
      {
        path: "classification.compromises.confidentiality",
        label: "Could the data have been seen by people who shouldn't see it?",
        kind: "tristate",
        options: TRISTATE,
        help: COMPROMISE_HELP,
        neededFor: ["checklist"],
      },
      { path: "classification.compromises.integrity", label: "Could the data have been changed or damaged?", kind: "tristate", options: TRISTATE, help: COMPROMISE_HELP, neededFor: ["checklist"] },
      { path: "classification.compromises.availability", label: "Was the data unavailable or lost?", kind: "tristate", options: TRISTATE, help: COMPROMISE_HELP, neededFor: ["checklist"] },
    ],
  },
  {
    id: "description",
    legend: "What happened",
    fields: [
      { path: "description.nature", label: "What happened, in simple words", kind: "textarea", neededFor: ["dp", ...BOARD], freeText: true },
      { path: "description.extent", label: "How much data, and how many people?", kind: "textarea", help: "For example: about 2,000 customer records.", neededFor: ["dp", ...BOARD], freeText: true },
      { path: "description.occurredAt", label: "When it happened", kind: "datetime", neededFor: ["dp", ...BOARD] },
      { path: "description.location", label: "Where it happened", kind: "textarea", help: "For example: which system, which vendor, or which office.", neededFor: BOARD, freeText: true },
      { path: "description.likelyImpact", label: "Likely impact", kind: "textarea", help: "What harm or disruption this could cause.", neededFor: BOARD, freeText: true },
      {
        path: "description.consequencesForPrincipals",
        label: "What could this mean for the affected people?",
        kind: "textarea",
        help: "For example: they may get scam calls.",
        neededFor: ["dp"],
        freeText: true,
      },
      { path: "description.eventsCircumstancesReasons", label: "How and why it happened", kind: "textarea", neededFor: ["board_detailed"], freeText: true },
      { path: "description.findingsOnResponsiblePerson.status", label: "Do you know who or what caused it?", kind: "select", options: FINDINGS, neededFor: ["board_detailed"] },
      {
        path: "description.findingsOnResponsiblePerson.summary",
        label: "What you found out about the cause",
        kind: "textarea",
        help: "Needed if you chose \"Yes — we have findings\". Describe the cause, not a named person.",
        neededFor: ["board_detailed"],
        freeText: true,
      },
    ],
  },
  {
    id: "data",
    legend: "Types of data involved",
    fields: [
      {
        path: "dataCategories",
        label: "Types of data, one per line",
        kind: "list",
        help: "For example: phone numbers, home addresses, order history. Never paste the data itself.",
        neededFor: [],
        freeText: true,
      },
    ],
  },
  {
    id: "principals",
    legend: "People affected — numbers only",
    help: "Enter numbers only. Never list names.",
    fields: [
      { path: "affectedPrincipals.estimatedTotal", label: "About how many people are affected?", kind: "count", neededFor: [] },
      { path: "affectedPrincipals.identified", label: "How many have you identified?", kind: "count", neededFor: ["board_detailed"] },
      { path: "affectedPrincipals.reachableViaUserAccount", label: "How many can you reach through their account with you?", kind: "count", neededFor: [] },
      { path: "affectedPrincipals.reachableViaRegisteredMode", label: "How many can you reach using contact details they gave you?", kind: "count", neededFor: [] },
      { path: "affectedPrincipals.noRegisteredChannel", label: "How many have no contact details on file?", kind: "count", neededFor: [] },
      { path: "affectedPrincipals.registeredChannelCompromised", label: "How many have contact details that were also affected?", kind: "count", neededFor: [] },
    ],
  },
  {
    id: "mitigation",
    legend: "What you are doing about it",
    help: 'One item per line. Tick "None" if there is nothing. Leave it blank if you haven\'t decided yet.',
    fields: [
      { path: "mitigation.implemented", label: "Steps already taken", kind: "listNullable", neededFor: ["dp", "board_detailed"], freeText: true },
      { path: "mitigation.proposed", label: "Steps in progress or planned", kind: "listNullable", neededFor: ["dp", "board_detailed"], freeText: true },
      {
        path: "mitigation.safetyMeasuresForPrincipals",
        label: "What affected people can do to protect themselves",
        kind: "listNullable",
        help: "For example: change your password; ignore calls asking for an OTP.",
        neededFor: ["dp"],
        freeText: true,
      },
      { path: "mitigation.remedialMeasuresAgainstRecurrence", label: "Steps to stop it happening again", kind: "listNullable", neededFor: ["board_detailed"], freeText: true },
    ],
  },
  {
    id: "contact",
    legend: "Contact for questions",
    fields: [
      {
        path: "queryContactAvailable",
        label: "Is there someone who can answer questions from affected people?",
        kind: "tristate",
        options: TRISTATE,
        help: "Just answer Yes or No. Don't type their details here — you will add them to the notice yourself.",
        neededFor: ["dp"],
      },
    ],
  },
  {
    id: "extension",
    legend: "Extra time from the Board",
    help: "Only if you asked the Data Protection Board for more time to send the detailed report.",
    fields: [
      { path: "extension.requestedAt", label: "When you asked for more time (in writing)", kind: "datetime", neededFor: [] },
      { path: "extension.grantedUntil", label: "Extra time allowed until", kind: "datetime", neededFor: [] },
    ],
  },
];

export const ALL_FIELDS: FieldSpec[] = GROUPS.flatMap((g) => g.fields);

export interface RowFieldSpec {
  key: string;
  label: string;
  kind: "select" | "textarea" | "datetime" | "count";
  options?: Option[];
}

export interface RepeatSpec {
  path: "classification.exemptionClaims" | "noticesSent";
  legend: string;
  itemLabel: string;
  help: string;
  neededFor: Use[];
  row: RowFieldSpec[];
}

export const REPEATS: RepeatSpec[] = [
  {
    path: "classification.exemptionClaims",
    legend: "Legal exemption (rare)",
    itemLabel: "Exemption",
    help: "Only fill this in if a lawyer says a legal exemption may apply (Act section 17(1)). This page records it but does not decide it.",
    neededFor: [],
    row: [
      { key: "clause", label: "Which exemption", kind: "select", options: [{ value: "", label: "Choose…" }, ...S17_CLAUSES] },
      { key: "basis", label: "Why it may apply", kind: "textarea" },
    ],
  },
  {
    path: "noticesSent",
    legend: "Notices already sent",
    itemLabel: "Notice",
    help: "Add each notice you have sent. The detailed report to the Board needs at least one notice to affected people.",
    neededFor: ["board_detailed"],
    row: [
      { key: "kind", label: "Who it went to", kind: "select", options: [{ value: "", label: "Choose…" }, ...NOTICE_KINDS] },
      { key: "sentAt", label: "When it was sent (IST)", kind: "datetime" },
      { key: "recipientCount", label: "How many people received it", kind: "count" },
      { key: "channel", label: "How it was sent", kind: "select", options: NOTICE_CHANNELS },
    ],
  },
];

// ---------------------------------------------------------------- form state

export type Row = Record<string, string>;

export interface FormState {
  response?: ResponseState;
  /** Raw input per FieldSpec path (all kinds except enumSet). */
  values: Record<string, string>;
  /** Selected values for enumSet fields. */
  sets: Record<string, string[]>;
  /** "Recorded as none" for listNullable fields. */
  none: Record<string, boolean>;
  rows: Record<RepeatSpec["path"], Row[]>;
}

export function emptyFormState(): FormState {
  const values: Record<string, string> = {};
  const sets: Record<string, string[]> = {};
  const none: Record<string, boolean> = {};
  for (const f of ALL_FIELDS) {
    if (f.kind === "enumSet") sets[f.path] = [];
    else values[f.path] = "";
    if (f.kind === "listNullable") none[f.path] = false;
  }
  return { values, sets, none, rows: { "classification.exemptionClaims": [], noticesSent: [] } };
}

export function emptyRow(spec: RepeatSpec): Row {
  return Object.fromEntries(spec.row.map((f) => [f.key, ""]));
}

// ---------------------------------------------------------------- conversions

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** "2026-10-20T09:00" (IST wall-clock, as from <input type="datetime-local">) → ISO with +05:30. */
export function localIstToIso(raw: string): string | null {
  if (!LOCAL_DATETIME.test(raw)) return null;
  const iso = `${raw.length === 16 ? `${raw}:00` : raw}+05:30`;
  return parseIsoWithOffset(iso).ok ? iso : null;
}

/** ISO with any offset → IST wall-clock "YYYY-MM-DDTHH:MM:SS" for a datetime-local input. */
export function isoToLocalIst(iso: string): string {
  return toIstIso(toEpochMs(iso)).slice(0, 19);
}

function lines(raw: string): string[] {
  return raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let node = target;
  for (const key of keys.slice(0, -1)) {
    if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]!] = value;
}

function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown> | null)?.[key], source);
}

export interface FieldError {
  path: string;
  message: string;
}

export interface ConversionResult {
  incident: Incident | null;
  errors: FieldError[];
}

function convertDatetime(raw: string, path: string, errors: FieldError[]): string | null {
  if (raw === "") return null;
  const iso = localIstToIso(raw);
  if (iso === null) errors.push({ path, message: "Enter a valid date and time." });
  return iso;
}

function convertCount(raw: string, path: string, errors: FieldError[]): number | null {
  const v = raw.trim();
  if (v === "") return null;
  if (!/^\d+$/.test(v)) {
    errors.push({ path, message: "Please enter a whole number like 250, or leave it blank." });
    return null;
  }
  return Number(v);
}

function convertField(f: FieldSpec, state: FormState, errors: FieldError[]): unknown {
  const raw = state.values[f.path] ?? "";
  switch (f.kind) {
    case "text":
      return raw.trim();
    case "textarea":
      return raw.trim() === "" ? null : raw.trim();
    case "datetime":
      return convertDatetime(raw, f.path, errors);
    case "tristate":
      return raw === "true" ? true : raw === "false" ? false : null;
    case "count":
      return convertCount(raw, f.path, errors);
    case "select":
      return raw === "" ? null : raw;
    case "enumSet": {
      const chosen = state.sets[f.path] ?? [];
      return (f.options ?? []).map((o) => o.value).filter((v) => chosen.includes(v));
    }
    case "list":
      return lines(raw);
    case "listNullable": {
      const items = lines(raw);
      if (state.none[f.path]) {
        if (items.length) errors.push({ path: f.path, message: 'You ticked "None" but also listed items. Clear one of them.' });
        return [];
      }
      return items.length ? items : null;
    }
  }
}

/** Builds an incident from the form and validates it against incident.schema.json. */
export function formToIncident(state: FormState): ConversionResult {
  const errors: FieldError[] = [];
  const out: Record<string, unknown> = { schemaVersion: 1 };
  if (state.response) { out["schemaVersion"] = 2; out["response"] = state.response; }
  for (const f of ALL_FIELDS) setPath(out, f.path, convertField(f, state, errors));

  setPath(
    out,
    "classification.exemptionClaims",
    state.rows["classification.exemptionClaims"].map((r, i) => {
      const path = `classification.exemptionClaims[${i}]`;
      if (!r["clause"]) errors.push({ path: `${path}.clause`, message: "Choose which exemption." });
      if (!(r["basis"] ?? "").trim()) errors.push({ path: `${path}.basis`, message: "Say why it may apply." });
      return { clause: r["clause"] ?? "", basis: (r["basis"] ?? "").trim() };
    }),
  );

  setPath(
    out,
    "noticesSent",
    state.rows.noticesSent.map((r, i) => {
      const path = `noticesSent[${i}]`;
      if (!r["kind"]) errors.push({ path: `${path}.kind`, message: "Choose who it went to." });
      const sentAt = convertDatetime(r["sentAt"] ?? "", `${path}.sentAt`, errors);
      if ((r["sentAt"] ?? "") === "") errors.push({ path: `${path}.sentAt`, message: "Enter when it was sent." });
      return {
        kind: r["kind"] ?? "",
        sentAt,
        recipientCount: convertCount(r["recipientCount"] ?? "", `${path}.recipientCount`, errors),
        channel: r["channel"] ? r["channel"] : null,
      };
    }),
  );

  if (errors.length) return { incident: null, errors };
  const v = validateIncident(out);
  if (v.ok) return { incident: v.incident, errors: [] };
  return { incident: null, errors: v.errors.map(schemaErrorToFieldError) };
}

const PLAIN_SCHEMA_MESSAGES: Record<string, string> = {
  "must not be empty": "Please fill this in.",
};

function schemaErrorToFieldError(message: string): FieldError {
  const m = /^\$\.?([^:]*): (.*)$/.exec(message);
  if (!m) return { path: "", message };
  const detail = m[2] ?? message;
  return { path: m[1] ?? "", message: PLAIN_SCHEMA_MESSAGES[detail] ?? detail };
}

export function incidentToForm(incident: Incident): FormState {
  const state = emptyFormState();
  if (incident.response) state.response = structuredClone(incident.response);
  for (const f of ALL_FIELDS) {
    const v = getPath(incident, f.path);
    switch (f.kind) {
      case "enumSet":
        state.sets[f.path] = [...(v as string[])];
        break;
      case "datetime":
        state.values[f.path] = typeof v === "string" ? isoToLocalIst(v) : "";
        break;
      case "list":
        state.values[f.path] = (v as string[]).join("\n");
        break;
      case "listNullable":
        state.none[f.path] = Array.isArray(v) && v.length === 0;
        state.values[f.path] = Array.isArray(v) ? v.join("\n") : "";
        break;
      default:
        state.values[f.path] = v === null || v === undefined ? "" : String(v);
    }
  }
  state.rows["classification.exemptionClaims"] = incident.classification.exemptionClaims.map((c) => ({
    clause: c.clause,
    basis: c.basis,
  }));
  state.rows.noticesSent = incident.noticesSent.map((n) => ({
    kind: n.kind,
    sentAt: isoToLocalIst(n.sentAt),
    recipientCount: n.recipientCount === null ? "" : String(n.recipientCount),
    channel: n.channel ?? "",
  }));
  return state;
}

/** Label for an error path such as "description.nature" or "noticesSent[0].sentAt". */
export function labelForPath(path: string): string {
  const field = ALL_FIELDS.find((f) => f.path === path);
  if (field) return field.label;
  const row = /^(classification\.exemptionClaims|noticesSent)\[(\d+)\]\.(\w+)$/.exec(path);
  if (row) {
    const spec = REPEATS.find((r) => r.path === row[1]);
    const sub = spec?.row.find((f) => f.key === row[3]);
    if (spec && sub) return `${spec.itemLabel} ${Number(row[2]) + 1}: ${sub.label}`;
  }
  return EXTRA_PATH_LABELS[path] ?? (path || "Incident record");
}

/** Labels for names the checks report that are not single form fields. */
const EXTRA_PATH_LABELS: Record<string, string> = {
  "classification.eventTypes": "What happened?",
  "classification.compromises": "Seen, changed or lost? (the three questions under \"Is this a data breach?\")",
  "classification.exemptionClaims": "Legal exemption",
  noticesSent: "Notices already sent (add a notice to affected people)",
  "noticesSent[kind=dp_intimation]": "Notices already sent (add a notice to affected people)",
  "noticesSent[kind=dp_intimation].recipientCount": "How many people received each notice",
};

// ---------------------------------------------------------------- import / export

export const MAX_IMPORT_BYTES = 1_000_000;

export type ImportResult = { ok: true; incident: Incident } | { ok: false; errors: string[] };

/**
 * Parses and schema-validates an imported incident file. Unknown fields are rejected by
 * validateIncident, including own keys named like Object.prototype members ("__proto__",
 * "constructor", "toString"), because it checks field names with own-property semantics.
 */
export function parseIncidentFile(text: string, byteLength: number): ImportResult {
  if (byteLength > MAX_IMPORT_BYTES) return { ok: false, errors: ["This file is too large (over 1 MB)."] };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["This file can't be read. Choose a file saved from this page (.json)."] };
  }
  const v = validateIncident(data);
  return v.ok ? { ok: true, incident: v.incident } : { ok: false, errors: v.errors };
}

export function safeFilename(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._]+/, "").slice(0, 80);
  return cleaned || "incident";
}

export function exportIncident(incident: Incident): { filename: string; text: string } {
  return { filename: `${safeFilename(incident.incidentId)}.incident.json`, text: `${JSON.stringify(incident, null, 2)}\n` };
}

// ---------------------------------------------------------------- panels

export type Basis = AwarenessBasis | "";

export const BASIS_OPTIONS: Option[] = [
  { value: "", label: "Choose…" },
  { value: "fiduciary", label: "When your organisation found out" },
  { value: "processor", label: "When your vendor found out" },
  { value: "earliest", label: "Whichever was earlier" },
];

/**
 * Open legal questions in everyday words, keyed by the AMB ID in docs/requirements.md §5. The
 * ID stays visible so an adviser can look up the full wording there.
 */
export const PLAIN_QUESTIONS: Readonly<Record<string, string>> = {
  "AMB-01": 'When exactly did you "find out"? The law doesn\'t define it.',
  "AMB-02": 'How fast is "without delay"? The law gives no exact time.',
  "AMB-03": "Do people you identify later also need a notice? The law isn't clear.",
  "AMB-04": 'Who counts as "affected"? The law doesn\'t define it.',
  "AMB-05": "Does a small or low-risk breach still need notices? The law sets no minimum.",
  "AMB-06": "How do you reach people with no contact details on file? The law doesn't say.",
  "AMB-07": 'Does "where it happened" mean a place, a system or a vendor? The law doesn\'t say.',
  "AMB-08": "How do you send the notice to the Board? No official form or website has been published.",
  "AMB-09": "Do you need to send updates after the 72-hour report? The law doesn't say.",
  "AMB-10": "What if not everyone has been told by the time of the 72-hour report? The law doesn't say.",
  "AMB-11": "How much must you say about who caused it? The law doesn't say.",
  "AMB-12": "When must you ask for more time, and what applies while you wait? The law doesn't say.",
  "AMB-13": "Does the clock start when your vendor found out, or when you did? The law doesn't say.",
  "AMB-14": "When exactly do these rules start? The date shown is calculated, not stated in the Rules.",
  "AMB-15": "Does a legal exemption apply? Only a lawyer can decide.",
  "AMB-16": "Is the penalty amount right? It needs checking against the printed law.",
  "AMB-17": "Is unauthorised use a breach even if nothing was exposed, changed or lost? The wording is unclear.",
  "AMB-18": "Is a report sent at exactly 72 hours on time? The law doesn't say.",
  "AMB-19": "For children or people with a disability, should the notice go to them, their parent or guardian, or both? The law doesn't say.",
  "AMB-20": "If more than one organisation is responsible for the data, who sends the notices? The law doesn't say.",
};

export interface PanelLine {
  label: string;
  value: string;
}

export interface PanelVM {
  title: string;
  tone: "ok" | "warn" | "neutral";
  summary: string;
  /** Share of a time window used so far (0–1), shown as a ring; absent when not applicable. */
  meter?: { fraction: number; caption: string };
  lines: PanelLine[];
  /** Open legal questions this panel touched, as "AMB-xx: plain question". */
  notes: string[];
}

function notesOf(interps: { ambiguityId: string }[]): string[] {
  return [...new Set(interps.map((i) => i.ambiguityId))].map((id) => `${id}: ${PLAIN_QUESTIONS[id] ?? id}`);
}

/** "1h 30m 0s" up to two days; "3 days 4 hours" beyond. */
export function friendlyDuration(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < 48 * 3_600_000) return formatDuration(abs);
  const hours = Math.floor(abs / 3_600_000);
  return `${Math.floor(hours / 24)} days ${hours % 24} hours`;
}

const yesNo = (v: boolean | null) => (v === null ? "Not sure yet" : v ? "Yes" : "No");

const CHECKLIST_QUESTIONS: Record<string, string> = {
  "s2t-personal-data": "Is it information about people who can be identified?",
  "s2u-event-type": "Did something happen to the data (seen, shared, changed, lost…)?",
  "s2u-compromise": "Was the data exposed, changed or made unavailable?",
  "s17-1-exemption": "Has a legal exemption been noted?",
};

export function checklistPanel(incident: Incident): PanelVM {
  const c = evaluateBreachChecklist(incident);
  const summary: Record<typeof c.intimation, string> = {
    required: "Based on your answers, this fits the law's definition of a data breach, so notices are needed. Check with your adviser.",
    not_required_on_facts_given: "Based on your answers, this does not fit the law's definition of a data breach.",
    requires_legal_determination: "You noted a legal exemption. A lawyer must decide if it applies before you skip any notice.",
    indeterminate: "Can't tell yet. Answer the missing questions, or the law may be unclear here — see the open questions below.",
  };
  const meets = { meets_definition: "Yes", does_not_meet_definition: "No", indeterminate: "Not sure yet" }[c.definition];
  return {
    title: "Is this a data breach?",
    tone: c.intimation === "required" ? "warn" : c.intimation === "not_required_on_facts_given" ? "ok" : "neutral",
    summary: summary[c.intimation],
    lines: [
      ...c.items.map((i) => ({ label: CHECKLIST_QUESTIONS[i.id] ?? i.question, value: yesNo(i.answer) })),
      { label: "Fits the law's definition of a data breach?", value: meets },
      ...(c.missingFacts.length ? [{ label: "Still to answer", value: c.missingFacts.map(labelForPath).join("; ") }] : []),
    ],
    notes: notesOf(c.interpretation),
  };
}

const NEED_BASIS = 'Choose "Start the 72-hour clock from" above. The law doesn\'t say which time to use, so there is no default.';

const EXTENSION_LABELS: Record<string, string> = {
  none: "Not asked for",
  requested_pending: "Asked for — no reply yet",
  granted: "Given",
  granted_not_longer: "Given, but not longer than 72 hours",
};

function missingSummary(paths: string[]): string {
  return `Fill in: ${paths.map(labelForPath).join("; ")}.`;
}

export function deadlinePanel(incident: Incident, basis: Basis, nowIso: string): PanelVM {
  const title = "Deadline for the detailed report to the Board (72 hours)";
  if (basis === "") return { title, tone: "neutral", summary: NEED_BASIS, lines: [], notes: [] };
  const d = computeBoardReportDeadline(incident, { basis, now: nowIso });
  if (d.status === "missing_facts" || !d.effectiveDeadline) {
    return { title, tone: "neutral", summary: missingSummary(d.missingFacts), lines: [], notes: notesOf(d.interpretation) };
  }
  const left = d.effectiveDeadline.epochMs - toEpochMs(nowIso);
  const timing: Record<string, string> = {
    before_deadline: `${friendlyDuration(left)} left.`,
    at_deadline: "This is exactly the deadline. The law doesn't say whether that counts as on time.",
    after_deadline: `The deadline passed ${friendlyDuration(left)} ago.`,
  };
  const lines: PanelLine[] = [
    { label: "Clock starts", value: d.awareAt?.display ?? "" },
    { label: "Deadline", value: d.effectiveDeadline.display },
    { label: "Extra time from the Board", value: EXTENSION_LABELS[d.extension] ?? d.extension },
    ...d.candidates.map((c) => ({
      label: c.basis === "fiduciary" ? "Deadline if counted from when you found out" : "Deadline if counted from when your vendor found out",
      value: c.deadline.display,
    })),
  ];
  if (d.submission) lines.push({ label: "Detailed report sent", value: d.submission.at.display });
  const start = d.awareAt?.epochMs ?? d.effectiveDeadline.epochMs;
  const window = d.effectiveDeadline.epochMs - start;
  const used = window > 0 ? Math.max(0, Math.min(1, (toEpochMs(nowIso) - start) / window)) : 1;
  return {
    title,
    tone: d.submission ? "ok" : d.now?.timing === "before_deadline" ? "neutral" : "warn",
    summary: d.submission ? "You have recorded the detailed report as sent." : timing[d.now?.timing ?? ""] ?? "",
    meter: { fraction: used, caption: `${Math.round(used * 100)}% of the time used` },
    lines,
    notes: notesOf(d.interpretation),
  };
}

export function elapsedPanel(incident: Incident, basis: Basis, nowIso: string): PanelVM {
  const title = "Time since you found out";
  if (basis === "") return { title, tone: "neutral", summary: NEED_BASIS, lines: [], notes: [] };
  const t = trackWithoutDelay(incident, { basis, now: nowIso });
  if (t.status === "missing_facts" || !t.awareAt) {
    return { title, tone: "neutral", summary: missingSummary(t.missingFacts), lines: [], notes: notesOf(t.interpretation) };
  }
  const sinceMs = toEpochMs(nowIso) - t.awareAt.epochMs;
  if (sinceMs < 0) {
    return {
      title,
      tone: "neutral",
      summary: `The time you entered is ${friendlyDuration(-sinceMs)} in the future. Check the date — or this is a practice record.`,
      lines: [{ label: "Clock starts", value: t.awareAt.display }],
      notes: notesOf(t.interpretation),
    };
  }
  const p = t.principals;
  return {
    title,
    tone: "neutral",
    summary: `${friendlyDuration(sinceMs)} since you found out. Notices must go out "without delay"; the law gives no exact time limit.`,
    lines: [
      ...t.entries.map((e) => ({
        label: e.requirementId === "BR-DP-01" ? "Notice to affected people" : "First notice to the Board",
        value:
          e.status === "sent"
            ? `Sent ${friendlyDuration(e.elapsedMs)} after you found out`
            : `Not sent yet — ${friendlyDuration(e.elapsedMs)} so far`,
      })),
      { label: "People told so far", value: `${p.notified} of ${p.identified ?? "unknown"}` },
    ],
    notes: notesOf(t.interpretation),
  };
}

export function commencementPanel(nowIso: string): PanelVM {
  const b = commencementBanner(nowIso);
  return {
    title: "When the rules start",
    tone: b.status === "on_or_after_computed_date" ? "ok" : "neutral",
    summary:
      "The Rules don't give a calendar date. They say Rule 7 starts eighteen months after they were published " +
      `(13 Nov 2025). We calculate that as ${formatDay(b.computedDate)}. Check this with your adviser.`,
    lines: [
      { label: "Today", value: b.status === "on_or_after_computed_date" ? "Rule 7 is in force (on our calculation)" : "Rule 7 is not in force yet (on our calculation)" },
      ...b.stated.map((s) => ({ label: "What the official text says", value: s })),
      ...b.alternatives.map((a) => ({ label: "Another possible reading", value: a })),
    ],
    notes: notesOf(b.interpretation),
  };
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

/** One-line commencement status for the page header. The date is computed, not stated (AMB-14). */
export function commencementHeadline(nowIso: string): { text: string; reached: boolean } {
  const b = commencementBanner(nowIso);
  return {
    text: `Rule 7 starts on ${formatDay(b.computedDate)} by our calculation — the Rules don't give an exact date.`,
    reached: b.status === "on_or_after_computed_date",
  };
}

// ---------------------------------------------------------------- progress

/** Every fact the checklist or drafts report as missing for an incident. */
function missingNames(incident: Incident): Set<string> {
  const board = generateBoardReports(incident);
  return new Set([
    ...evaluateBreachChecklist(incident).missingFacts,
    ...generateDataPrincipalNotice(incident).missingFields,
    ...board.initial.missingFields,
    ...board.detailed.missingFields,
  ]);
}

let baselineNeeded: Set<string> | null = null;

/** The facts an empty record is missing: the denominator for progress. */
function neededFacts(): Set<string> {
  if (!baselineNeeded) {
    const empty = emptyFormState();
    empty.values["incidentId"] = "progress-baseline";
    const minimal = formToIncident(empty).incident;
    baselineNeeded = minimal ? missingNames(minimal) : new Set();
  }
  return baselineNeeded;
}

/** How many of the facts the checks and drafts need are filled in. */
export function progressOf(incident: Incident): { done: number; total: number } {
  const needed = neededFacts();
  const missing = missingNames(incident);
  let stillMissing = 0;
  for (const name of needed) if (missing.has(name)) stillMissing++;
  return { done: needed.size - stillMissing, total: needed.size };
}

// ---------------------------------------------------------------- drafts

export interface DraftTab {
  kind: DraftKind;
  label: string;
  /** Who the draft is for and when it is due, in plain words. */
  purpose: string;
  text: string;
  filename: string;
  missingFields: string[];
  ambiguities: { id: string; reason: string }[];
}

const DRAFT_LABELS: Record<DraftKind, { label: string; purpose: string }> = {
  data_principal_notice: {
    label: "To affected people",
    purpose: "Notice to each person whose data was involved. Send it without delay.",
  },
  board_initial: {
    label: "To the Board — first notice",
    purpose: "First short notice to the Data Protection Board. Send it without delay.",
  },
  board_detailed: {
    label: "To the Board — full report",
    purpose: "Detailed report to the Data Protection Board. Due within 72 hours, unless the Board gives more time.",
  },
};

export function draftTabs(incident: Incident): DraftTab[] {
  const board = generateBoardReports(incident);
  return [generateDataPrincipalNotice(incident), board.initial, board.detailed].map((d: Draft) => ({
    kind: d.kind,
    label: DRAFT_LABELS[d.kind].label,
    purpose: DRAFT_LABELS[d.kind].purpose,
    text: d.text,
    filename: `${safeFilename(incident.incidentId)}-${d.kind}.txt`,
    missingFields: d.missingFields,
    ambiguities: d.ambiguities.map((a) => ({ id: a.id, reason: PLAIN_QUESTIONS[a.id] ?? a.reason })),
  }));
}

/** Current instant as ISO with the IST offset, for the panels. */
export function nowIso(epochMs: number): string {
  return toIstIso(epochMs);
}
