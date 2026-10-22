import { interpretation, type Interpretation } from "./ambiguities";
import { computeBoardReportDeadline, type AwarenessBasis } from "./deadline";
import { formatDuration, toEpochMs, view } from "./time";
import type { Incident, InstantView, IsoDateTime, NoticeKind } from "./types";

export interface WithoutDelayEntry {
  requirementId: "BR-DP-01" | "BR-BD-01";
  noticeKind: NoticeKind;
  status: "not_sent" | "sent";
  /** First notice of this kind, if any. */
  firstSentAt: InstantView | null;
  /** Awareness → first notice if sent, otherwise awareness → now. */
  elapsedMs: number;
  elapsed: string;
  /** Always null: r. 7 states no maximum for "without delay" (AMB-02). */
  threshold: null;
}

export interface PrincipalCoverage {
  requirementIds: ["BR-DP-01", "BR-DP-04"];
  notified: number;
  identified: number | null;
  estimatedTotal: number | null;
  noRegisteredChannel: number | null;
  registeredChannelCompromised: number | null;
}

export interface WithoutDelayReport {
  basis: AwarenessBasis;
  status: "tracked" | "missing_facts";
  missingFacts: string[];
  awareAt: InstantView | null;
  now: InstantView;
  entries: WithoutDelayEntry[];
  principals: PrincipalCoverage;
  interpretation: Interpretation[];
}

/**
 * Elapsed-time tracker for the "without delay" intimations: to affected Data Principals
 * (r. 7(1), BR-DP-01) and the initial Board intimation (r. 7(2)(a), BR-BD-01).
 * It measures and never judges: no elapsed time is classified as late.
 */
export function trackWithoutDelay(
  incident: Incident,
  options: { basis: AwarenessBasis; now: IsoDateTime },
): WithoutDelayReport {
  const deadline = computeBoardReportDeadline(incident, options);
  const nowMs = toEpochMs(options.now);
  const notes: Interpretation[] = deadline.interpretation.filter(
    (n) => n.ambiguityId === "AMB-01" || n.ambiguityId === "AMB-13",
  );

  notes.push(
    interpretation(
      "AMB-02",
      ["BR-DP-01", "BR-BD-01"],
      "Elapsed time is reported with no threshold; nothing is classified as delayed.",
      ["Apply an internal target (e.g. N hours) as a proxy for \"without delay\"."],
    ),
  );

  const entries: WithoutDelayEntry[] = [];
  const awareMs = deadline.awareAt?.epochMs;
  if (awareMs !== undefined) {
    const specs = [
      { requirementId: "BR-DP-01", noticeKind: "dp_intimation" },
      { requirementId: "BR-BD-01", noticeKind: "board_initial" },
    ] as const;
    for (const spec of specs) {
      const first = incident.noticesSent
        .filter((n) => n.kind === spec.noticeKind)
        .map((n) => toEpochMs(n.sentAt))
        .sort((a, b) => a - b)[0];
      const elapsedMs = (first ?? nowMs) - awareMs;
      entries.push({
        requirementId: spec.requirementId,
        noticeKind: spec.noticeKind,
        status: first === undefined ? "not_sent" : "sent",
        firstSentAt: first === undefined ? null : view(first),
        elapsedMs,
        elapsed: formatDuration(elapsedMs),
        threshold: null,
      });
    }
  }

  const ap = incident.affectedPrincipals;
  const notified = incident.noticesSent
    .filter((n) => n.kind === "dp_intimation")
    .reduce((sum, n) => sum + (n.recipientCount ?? 0), 0);

  notes.push(
    interpretation(
      "AMB-04",
      ["BR-DP-01"],
      'Coverage is measured against the recorded "identified" count; who counts as affected is ' +
        "taken from the incident record and not decided here.",
      [
        "Everyone whose data was involved (compare with estimatedTotal).",
        "Only principals facing likely consequences.",
      ],
    ),
  );

  if (ap.identified === null || (ap.estimatedTotal !== null && ap.identified < ap.estimatedTotal)) {
    notes.push(
      interpretation(
        "AMB-03",
        ["BR-DP-01", "BR-DP-02"],
        "Not all estimated affected principals are identified; no conclusion is drawn about " +
          "whether principals identified later must also be notified.",
        [
          '"To the best of its knowledge" limits the duty to principals currently known.',
          "Principals identified later must also be notified.",
        ],
      ),
    );
  }

  if ((ap.noRegisteredChannel ?? 0) > 0 || (ap.registeredChannelCompromised ?? 0) > 0) {
    notes.push(
      interpretation(
        "AMB-06",
        ["BR-DP-04"],
        "Principals with no registered channel, or whose registered channel was compromised, are " +
          "counted; no alternative channel is proposed.",
        ["Public notice or another channel not named in r. 7(1)."],
      ),
    );
  }

  const effective = deadline.effectiveDeadline;
  const dpIncomplete = ap.identified === null || notified < ap.identified;
  if (effective && nowMs >= effective.epochMs && dpIncomplete) {
    notes.push(
      interpretation(
        "AMB-10",
        ["BR-BD-07", "BR-DP-01"],
        "The detailed Board report deadline has been reached while Data Principal intimation is " +
          "incomplete; this is flagged, not classified as a breach of r. 7(1).",
        ['Treat r. 7(2)(b)(vi) as requiring all Data Principal intimations within 72 hours.'],
      ),
    );
  }

  return {
    basis: options.basis,
    status: awareMs === undefined ? "missing_facts" : "tracked",
    missingFacts: deadline.missingFacts,
    awareAt: deadline.awareAt,
    now: view(nowMs),
    entries,
    principals: {
      requirementIds: ["BR-DP-01", "BR-DP-04"],
      notified,
      identified: ap.identified,
      estimatedTotal: ap.estimatedTotal,
      noRegisteredChannel: ap.noRegisteredChannel,
      registeredChannelCompromised: ap.registeredChannelCompromised,
    },
    interpretation: notes,
  };
}
