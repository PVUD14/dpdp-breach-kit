import { describe, expect, it } from "vitest";
import { trackWithoutDelay } from "../src/core/withoutDelay";
import { baseIncident, withChanges } from "./fixtures";

const ids = (r: { interpretation: { ambiguityId: string }[] }) => r.interpretation.map((i) => i.ambiguityId);

describe("trackWithoutDelay", () => {
  it("reports elapsed time to now for unsent notices, with no threshold (AMB-02)", () => {
    const r = trackWithoutDelay(baseIncident(), { basis: "fiduciary", now: "2026-10-20T11:30:15+05:30" });
    expect(r.status).toBe("tracked");
    expect(r.entries.map((e) => [e.requirementId, e.status, e.elapsed, e.threshold])).toEqual([
      ["BR-DP-01", "not_sent", "2h 30m 15s", null],
      ["BR-BD-01", "not_sent", "2h 30m 15s", null],
    ]);
    expect(ids(r)).toContain("AMB-02");
  });

  it("measures to the first notice once sent", () => {
    const r = trackWithoutDelay(
      withChanges((i) => {
        i.noticesSent = [
          { kind: "board_initial", sentAt: "2026-10-20T13:00:00+05:30", recipientCount: null, channel: null },
          { kind: "board_initial", sentAt: "2026-10-20T10:00:00+05:30", recipientCount: null, channel: null },
          { kind: "dp_intimation", sentAt: "2026-10-20T07:30:00Z", recipientCount: 60, channel: "user_account" },
        ];
      }),
      { basis: "fiduciary", now: "2026-10-21T09:00:00+05:30" },
    );
    const [dp, bd] = r.entries;
    expect(dp?.elapsed).toBe("4h 0m 0s");
    expect(bd?.elapsed).toBe("1h 0m 0s");
    expect(bd?.firstSentAt?.iso).toBe("2026-10-20T10:00:00.000+05:30");
    expect(r.principals.notified).toBe(60);
  });

  it("flags incomplete DP intimation once the 72h report deadline is reached (AMB-10)", () => {
    const incident = withChanges((i) => {
      i.noticesSent = [{ kind: "dp_intimation", sentAt: "2026-10-20T12:00:00+05:30", recipientCount: 99, channel: "user_account" }];
    });
    const before = trackWithoutDelay(incident, { basis: "fiduciary", now: "2026-10-23T08:59:59+05:30" });
    const at = trackWithoutDelay(incident, { basis: "fiduciary", now: "2026-10-23T09:00:00+05:30" });
    expect(ids(before)).not.toContain("AMB-10");
    expect(ids(at)).toContain("AMB-10");
  });

  it("flags principals with no usable channel (AMB-06) and unidentified principals (AMB-03)", () => {
    const r = trackWithoutDelay(
      withChanges((i) => {
        i.affectedPrincipals.identified = 90;
        i.affectedPrincipals.noRegisteredChannel = 5;
      }),
      { basis: "fiduciary", now: "2026-10-20T10:00:00+05:30" },
    );
    expect(ids(r)).toEqual(expect.arrayContaining(["AMB-03", "AMB-04", "AMB-06"]));
  });

  it("starts from processor awareness only when chosen", () => {
    const incident = withChanges((i) => {
      i.awareness.processorInvolved = true;
      i.awareness.processorAwareAt = "2026-10-20T06:00:00+05:30";
    });
    const now = "2026-10-20T10:00:00+05:30";
    expect(trackWithoutDelay(incident, { basis: "fiduciary", now }).entries[0]?.elapsed).toBe("1h 0m 0s");
    expect(trackWithoutDelay(incident, { basis: "earliest", now }).entries[0]?.elapsed).toBe("4h 0m 0s");
    expect(ids(trackWithoutDelay(incident, { basis: "earliest", now }))).toContain("AMB-13");
  });

  it("returns no entries and lists missing facts when awareness is unknown", () => {
    const r = trackWithoutDelay(withChanges((i) => (i.awareness.fiduciaryAwareAt = null)), {
      basis: "fiduciary",
      now: "2026-10-20T10:00:00+05:30",
    });
    expect(r.status).toBe("missing_facts");
    expect(r.entries).toEqual([]);
    expect(r.missingFacts).toEqual(["awareness.fiduciaryAwareAt"]);
  });
});
