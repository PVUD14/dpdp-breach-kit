import { interpretation, type Interpretation } from "./ambiguities";
import { HOUR_MS, formatDuration, toEpochMs, view } from "./time";
import type { Incident, InstantView, IsoDateTime } from "./types";

/**
 * Whose awareness starts the clock (AMB-01, AMB-13). There is no default: the caller must
 * choose, and every available alternative is returned alongside.
 */
export type AwarenessBasis = "fiduciary" | "processor" | "earliest";

export const BOARD_REPORT_WINDOW_MS = 72 * HOUR_MS;

export type Timing = "before_deadline" | "at_deadline" | "after_deadline";

export interface DeadlineCandidate {
  basis: "fiduciary" | "processor";
  awareAt: InstantView;
  deadline: InstantView;
}

export interface BoardReportDeadline {
  requirementIds: ["BR-BD-02", "BR-BD-08"];
  basis: AwarenessBasis;
  status: "computed" | "missing_facts";
  missingFacts: string[];
  awareAt: InstantView | null;
  /** awareAt + 72h, before any extension. */
  baseDeadline: InstantView | null;
  /** The deadline after applying a granted extension, if any. */
  effectiveDeadline: InstantView | null;
  candidates: DeadlineCandidate[];
  extension: "none" | "requested_pending" | "granted" | "granted_not_longer";
  now: { at: InstantView; timing: Timing; remaining: string } | null;
  submission: { at: InstantView; timing: Timing } | null;
  interpretation: Interpretation[];
}

function timingOf(atMs: number, deadlineMs: number): Timing {
  if (atMs < deadlineMs) return "before_deadline";
  if (atMs === deadlineMs) return "at_deadline";
  return "after_deadline";
}

function candidate(basis: "fiduciary" | "processor", iso: IsoDateTime | null): DeadlineCandidate | null {
  if (iso === null) return null;
  const aware = toEpochMs(iso);
  return { basis, awareAt: view(aware), deadline: view(aware + BOARD_REPORT_WINDOW_MS) };
}

/**
 * Deadline for the detailed Board report under r. 7(2)(b): seventy-two hours from becoming
 * aware, or a longer period the Board allows on written request.
 * The incident is expected to have passed validateIncident.
 */
export function computeBoardReportDeadline(
  incident: Incident,
  options: { basis: AwarenessBasis; now?: IsoDateTime },
): BoardReportDeadline {
  const { basis } = options;
  const { awareness, extension } = incident;
  const notes: Interpretation[] = [];
  const missingFacts: string[] = [];

  const fiduciary = candidate("fiduciary", awareness.fiduciaryAwareAt);
  const processor = candidate("processor", awareness.processorAwareAt);
  const candidates = [fiduciary, processor].filter((c): c is DeadlineCandidate => c !== null);

  let chosen: DeadlineCandidate | null = null;
  if (basis === "fiduciary") {
    chosen = fiduciary;
    if (!chosen) missingFacts.push("awareness.fiduciaryAwareAt");
  } else if (basis === "processor") {
    chosen = processor;
    if (!chosen) missingFacts.push("awareness.processorAwareAt");
  } else {
    chosen = candidates.reduce<DeadlineCandidate | null>(
      (min, c) => (min === null || c.awareAt.epochMs < min.awareAt.epochMs ? c : min),
      null,
    );
    if (!chosen) missingFacts.push("awareness.fiduciaryAwareAt", "awareness.processorAwareAt");
  }

  notes.push(
    interpretation(
      "AMB-01",
      ["BR-BD-02"],
      `The clock starts at the recorded ${basis === "earliest" ? "earliest awareness" : `${basis} awareness`} ` +
        "timestamp as supplied; this module does not decide what event counts as becoming aware.",
      [
        "First detection of a suspicious event.",
        "Confirmation that personal data was involved.",
        "Awareness at a particular level of the organisation.",
      ],
    ),
  );

  if (processor || awareness.processorInvolved === true) {
    const earlier =
      fiduciary && processor && processor.awareAt.epochMs < fiduciary.awareAt.epochMs
        ? ` Processor awareness precedes fiduciary awareness by ${formatDuration(
            fiduciary.awareAt.epochMs - processor.awareAt.epochMs,
          )}.`
        : "";
    notes.push(
      interpretation(
        "AMB-13",
        ["BR-BD-02", "BR-GEN-01"],
        `Basis "${basis}" was selected by the caller; all available bases are listed in candidates.${earlier}`,
        [
          "Processor awareness is the fiduciary's awareness (clock starts at processorAwareAt).",
          "Only the fiduciary's own awareness starts the clock (clock starts at fiduciaryAwareAt).",
        ],
      ),
    );
  }

  const base = chosen ? chosen.deadline : null;
  let effective = base;
  let extensionState: BoardReportDeadline["extension"] = "none";

  if (extension.grantedUntil !== null) {
    const granted = toEpochMs(extension.grantedUntil);
    if (base && granted <= base.epochMs) {
      extensionState = "granted_not_longer";
      notes.push(
        interpretation(
          "AMB-12",
          ["BR-BD-08"],
          "Recorded grant is not later than the 72-hour deadline, so the 72-hour deadline is kept.",
          ['Treat the recorded grant date as the deadline regardless (the rule allows only a "longer period").'],
        ),
      );
    } else {
      extensionState = "granted";
      effective = view(granted);
    }
  } else if (extension.requestedAt !== null) {
    extensionState = "requested_pending";
    notes.push(
      interpretation(
        "AMB-12",
        ["BR-BD-08"],
        "Extension requested but no grant recorded: the 72-hour deadline is still applied.",
        ["Treat the pending request as suspending the 72-hour deadline (not stated in the text)."],
      ),
    );
  }

  let nowInfo: BoardReportDeadline["now"] = null;
  if (options.now !== undefined && effective) {
    const nowMs = toEpochMs(options.now);
    nowInfo = {
      at: view(nowMs),
      timing: timingOf(nowMs, effective.epochMs),
      remaining: formatDuration(effective.epochMs - nowMs),
    };
  }

  const reports = incident.noticesSent
    .filter((n) => n.kind === "board_detailed")
    .map((n) => toEpochMs(n.sentAt))
    .sort((a, b) => a - b);
  const firstReport = reports[0];
  const submission =
    firstReport !== undefined && effective
      ? { at: view(firstReport), timing: timingOf(firstReport, effective.epochMs) }
      : null;

  if (nowInfo?.timing === "at_deadline" || submission?.timing === "at_deadline") {
    notes.push(
      interpretation(
        "AMB-18",
        ["BR-BD-02"],
        'Reported as "at_deadline" rather than classified as within or outside the window.',
        [
          "Exactly 72:00:00 is within seventy-two hours (inclusive).",
          "Only times strictly before 72:00:00 are within (exclusive).",
        ],
      ),
    );
  }

  return {
    requirementIds: ["BR-BD-02", "BR-BD-08"],
    basis,
    status: chosen ? "computed" : "missing_facts",
    missingFacts,
    awareAt: chosen ? chosen.awareAt : null,
    baseDeadline: base,
    effectiveDeadline: effective,
    candidates,
    extension: extensionState,
    now: nowInfo,
    submission,
    interpretation: notes,
  };
}
