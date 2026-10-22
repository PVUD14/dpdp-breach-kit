import type { InstantView, IsoDateTime } from "./types";

/** Asia/Kolkata is a fixed UTC+05:30 with no daylight saving, so plain arithmetic is exact. */
export const IST_OFFSET_MINUTES = 330;

export const HOUR_MS = 3_600_000;

const ISO_WITH_OFFSET =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|([+-])(\d{2}):(\d{2}))$/;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type ParseResult = { ok: true; epochMs: number } | { ok: false; error: string };

/**
 * Parses an ISO-8601 date-time that carries an explicit offset ("Z" or "±HH:MM").
 * Rejects local times without an offset and impossible calendar values.
 * Fractions finer than a millisecond are truncated.
 */
export function parseIsoWithOffset(value: string): ParseResult {
  const m = ISO_WITH_OFFSET.exec(value);
  if (!m) return { ok: false, error: `not ISO-8601 with offset: "${value}"` };
  const [, y, mo, d, h, mi, s, frac, zone, sign, oh, om] = m;
  const year = Number(y), month = Number(mo), day = Number(d);
  const hour = Number(h), minute = Number(mi), second = Number(s);
  const ms = frac ? Number(frac.slice(0, 3).padEnd(3, "0")) : 0;
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) {
    return { ok: false, error: `out-of-range field in "${value}"` };
  }
  const local = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  if (new Date(local).getUTCDate() !== day) {
    return { ok: false, error: `no such calendar date in "${value}"` };
  }
  let offsetMinutes = 0;
  if (zone !== "Z") {
    const oHours = Number(oh), oMinutes = Number(om);
    if (oHours > 23 || oMinutes > 59) return { ok: false, error: `bad offset in "${value}"` };
    offsetMinutes = (sign === "-" ? -1 : 1) * (oHours * 60 + oMinutes);
  }
  return { ok: true, epochMs: local - offsetMinutes * 60_000 };
}

/** Throwing variant for inputs already checked by validateIncident. */
export function toEpochMs(value: IsoDateTime): number {
  const r = parseIsoWithOffset(value);
  if (!r.ok) throw new RangeError(r.error);
  return r.epochMs;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/** Wall-clock fields in IST for an instant. */
function istFields(epochMs: number) {
  const d = new Date(epochMs + IST_OFFSET_MINUTES * 60_000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    ms: d.getUTCMilliseconds(),
  };
}

export function toIstIso(epochMs: number): string {
  const f = istFields(epochMs);
  return (
    `${pad(f.year, 4)}-${pad(f.month)}-${pad(f.day)}T${pad(f.hour)}:${pad(f.minute)}:${pad(f.second)}` +
    `.${pad(f.ms, 3)}+05:30`
  );
}

export function toIstDisplay(epochMs: number): string {
  const f = istFields(epochMs);
  return `${f.day} ${MONTHS[f.month - 1]} ${f.year}, ${pad(f.hour)}:${pad(f.minute)}:${pad(f.second)} IST`;
}

/** The IST calendar date ("YYYY-MM-DD") on which an instant falls. */
export function toIstDate(epochMs: number): string {
  return toIstIso(epochMs).slice(0, 10);
}

export function view(epochMs: number): InstantView {
  return { epochMs, iso: toIstIso(epochMs), display: toIstDisplay(epochMs) };
}

/** "71h 59m 59s"; negative durations are prefixed with "-". */
export function formatDuration(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${sign}${h}h ${m}m ${s}s`;
}
