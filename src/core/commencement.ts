import { interpretation, type Interpretation } from "./ambiguities";
import { toEpochMs, toIstDate } from "./time";
import type { IsoDateTime } from "./types";

/** Printed on the Gazette: "New Delhi, the 13th November, 2025"; Gazette No. 760 (requirements §2). */
export const RULES_PUBLICATION_DATE = "2025-11-13";

export const COMMENCEMENT_MONTHS = 18;

export interface CommencementBanner {
  requirementIds: ["BR-GEN-04"];
  provisions: string[];
  stated: string[];
  publicationDate: string;
  /** Computed, not stated in the texts. */
  computedDate: string;
  /** Start of computedDate in IST. */
  computedStart: string;
  assumption: string;
  alternatives: string[];
  status: "before_computed_date" | "on_or_after_computed_date" | null;
  banner: string;
  interpretation: Interpretation[];
}

/**
 * Adds calendar months to a "YYYY-MM-DD" date, keeping the day of month and clamping to the
 * last day when the target month is shorter.
 */
export function addCalendarMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

function nextDay(date: string): string {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

/**
 * Banner data for when Rule 7 (and Act s.8(6)) commence. The date is computed from the
 * stated relative rule under an explicit assumption; the texts print no calendar date.
 */
export function commencementBanner(now?: IsoDateTime): CommencementBanner {
  const computedDate = addCalendarMonths(RULES_PUBLICATION_DATE, COMMENCEMENT_MONTHS);
  const computedStart = `${computedDate}T00:00:00.000+05:30`;
  const assumption =
    `Publication date ${RULES_PUBLICATION_DATE} as printed on the Gazette, plus ${COMMENCEMENT_MONTHS} ` +
    "calendar months to the same day of month, in force from 00:00 IST on that day.";

  let status: CommencementBanner["status"] = null;
  if (now !== undefined) {
    status = toIstDate(toEpochMs(now)) >= computedDate ? "on_or_after_computed_date" : "before_computed_date";
  }

  const alternatives = [
    `${nextDay(computedDate)}: if "eighteen months after" excludes the anniversary day itself.`,
    'Act s.8(6) commences "eighteen months from the date of publication" (G.S.R. 843(E) cl. (c)); ' +
      'a reading of "from" that differs from "after" in r. 1(4) could give a different day.',
  ];

  return {
    requirementIds: ["BR-GEN-04"],
    provisions: ["DPDP Rules, 2025 r. 7", "DPDP Act, 2023 s.8(6)"],
    stated: [
      'Rules r. 1(4), as corrected by G.S.R. 892(E): "eighteen months after the date of publication in the Official Gazette".',
      'G.S.R. 843(E) cl. (c): "eighteen months from the date of publication of this gazette".',
    ],
    publicationDate: RULES_PUBLICATION_DATE,
    computedDate,
    computedStart,
    assumption,
    alternatives,
    status,
    banner:
      `Rule 7 breach intimation: computed commencement ${computedDate} (IST). ` +
      `Not a date stated in the Rules — assumption: ${assumption} See AMB-14.`,
    interpretation: [
      interpretation("AMB-14", ["BR-GEN-04"], assumption, alternatives),
    ],
  };
}
