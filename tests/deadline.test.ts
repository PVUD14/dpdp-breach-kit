import { describe, expect, it } from "vitest";
import { computeBoardReportDeadline } from "../src/core/deadline";
import { baseIncident, withChanges } from "./fixtures";

const ids = (r: { interpretation: { ambiguityId: string }[] }) => r.interpretation.map((i) => i.ambiguityId);

describe("computeBoardReportDeadline — 72-hour boundary", () => {
  const incident = baseIncident(); // aware 2026-10-20T09:00:00+05:30

  it("is exactly 72 hours after awareness, displayed in IST", () => {
    const r = computeBoardReportDeadline(incident, { basis: "fiduciary" });
    expect(r.status).toBe("computed");
    expect(r.effectiveDeadline?.iso).toBe("2026-10-23T09:00:00.000+05:30");
    expect(r.effectiveDeadline?.display).toBe("23 Oct 2026, 09:00:00 IST");
    expect(ids(r)).toContain("AMB-01");
  });

  it("classifies 1 ms before, exactly at, and 1 ms after the deadline", () => {
    const at = (now: string) => computeBoardReportDeadline(incident, { basis: "fiduciary", now }).now?.timing;
    expect(at("2026-10-23T08:59:59.999+05:30")).toBe("before_deadline");
    expect(at("2026-10-23T09:00:00+05:30")).toBe("at_deadline");
    expect(at("2026-10-23T09:00:00.001+05:30")).toBe("after_deadline");
  });

  it("does not resolve 'exactly 72h' silently (AMB-18)", () => {
    const r = computeBoardReportDeadline(
      withChanges((i) => (i.noticesSent = [{ kind: "board_detailed", sentAt: "2026-10-23T03:30:00Z", recipientCount: null, channel: null }])),
      { basis: "fiduciary" },
    );
    expect(r.submission?.timing).toBe("at_deadline");
    expect(ids(r)).toContain("AMB-18");
  });

  it("stays exact when inputs use a zone that changes DST during the window", () => {
    // US DST starts 2026-03-08; IST has none, so the window is 72 elapsed hours.
    const r = computeBoardReportDeadline(
      withChanges((i) => (i.awareness.fiduciaryAwareAt = "2026-03-07T10:00:00-05:00")),
      { basis: "fiduciary", now: "2026-03-10T11:00:00-04:00" },
    );
    expect(r.awareAt?.iso).toBe("2026-03-07T20:30:00.000+05:30");
    expect(r.effectiveDeadline?.iso).toBe("2026-03-10T20:30:00.000+05:30");
    expect(r.now?.timing).toBe("at_deadline");
  });
});

describe("computeBoardReportDeadline — awareness basis", () => {
  const processorFirst = withChanges((i) => {
    i.awareness.processorInvolved = true;
    i.awareness.processorAwareAt = "2026-10-19T21:00:00+05:30";
    i.awareness.processorNotifiedFiduciaryAt = "2026-10-20T08:30:00+05:30";
  });

  it("lists both candidates and flags processor-first awareness (AMB-13)", () => {
    const r = computeBoardReportDeadline(processorFirst, { basis: "fiduciary" });
    expect(r.candidates.map((c) => c.basis)).toEqual(["fiduciary", "processor"]);
    expect(r.effectiveDeadline?.iso).toBe("2026-10-23T09:00:00.000+05:30");
    const amb13 = r.interpretation.find((i) => i.ambiguityId === "AMB-13");
    expect(amb13?.choice).toContain("precedes fiduciary awareness by 12h 0m 0s");
  });

  it("uses processor or earliest awareness only when the caller asks", () => {
    expect(computeBoardReportDeadline(processorFirst, { basis: "processor" }).effectiveDeadline?.iso).toBe(
      "2026-10-22T21:00:00.000+05:30",
    );
    expect(computeBoardReportDeadline(processorFirst, { basis: "earliest" }).effectiveDeadline?.iso).toBe(
      "2026-10-22T21:00:00.000+05:30",
    );
  });

  it("reports missing facts instead of guessing an awareness time", () => {
    const r = computeBoardReportDeadline(
      withChanges((i) => (i.awareness.fiduciaryAwareAt = null)),
      { basis: "fiduciary", now: "2026-10-21T00:00:00+05:30" },
    );
    expect(r.status).toBe("missing_facts");
    expect(r.missingFacts).toEqual(["awareness.fiduciaryAwareAt"]);
    expect(r.effectiveDeadline).toBeNull();
    expect(r.now).toBeNull();
  });

  it("reports missing processor awareness when that basis is chosen", () => {
    const r = computeBoardReportDeadline(baseIncident(), { basis: "processor" });
    expect(r.missingFacts).toEqual(["awareness.processorAwareAt"]);
  });
});

describe("computeBoardReportDeadline — extension (AMB-12)", () => {
  it("keeps 72h while a request is pending", () => {
    const r = computeBoardReportDeadline(
      withChanges((i) => (i.extension.requestedAt = "2026-10-22T09:00:00+05:30")),
      { basis: "fiduciary" },
    );
    expect(r.extension).toBe("requested_pending");
    expect(r.effectiveDeadline?.iso).toBe("2026-10-23T09:00:00.000+05:30");
    expect(ids(r)).toContain("AMB-12");
  });

  it("applies a granted longer period", () => {
    const r = computeBoardReportDeadline(
      withChanges((i) => {
        i.extension.requestedAt = "2026-10-22T09:00:00+05:30";
        i.extension.grantedUntil = "2026-10-27T18:00:00+05:30";
      }),
      { basis: "fiduciary" },
    );
    expect(r.extension).toBe("granted");
    expect(r.baseDeadline?.iso).toBe("2026-10-23T09:00:00.000+05:30");
    expect(r.effectiveDeadline?.iso).toBe("2026-10-27T18:00:00.000+05:30");
  });

  it("ignores a recorded grant that is not longer than 72h, and says so", () => {
    const r = computeBoardReportDeadline(
      withChanges((i) => (i.extension.grantedUntil = "2026-10-22T09:00:00+05:30")),
      { basis: "fiduciary" },
    );
    expect(r.extension).toBe("granted_not_longer");
    expect(r.effectiveDeadline?.iso).toBe("2026-10-23T09:00:00.000+05:30");
    expect(ids(r)).toContain("AMB-12");
  });
});
