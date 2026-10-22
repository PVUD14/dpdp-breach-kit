import { describe, expect, it } from "vitest";
import { formatDuration, parseIsoWithOffset, toEpochMs, toIstDisplay, toIstIso } from "../src/core/time";

describe("parseIsoWithOffset", () => {
  it("treats Z and +05:30 forms of the same instant as equal", () => {
    expect(toEpochMs("2026-10-20T03:30:00Z")).toBe(toEpochMs("2026-10-20T09:00:00+05:30"));
  });

  it("rejects timestamps without an offset", () => {
    expect(parseIsoWithOffset("2026-10-20T09:00:00").ok).toBe(false);
  });

  it("rejects impossible calendar dates and offsets", () => {
    expect(parseIsoWithOffset("2026-02-30T09:00:00+05:30").ok).toBe(false);
    expect(parseIsoWithOffset("2026-10-20T24:00:00+05:30").ok).toBe(false);
    expect(parseIsoWithOffset("2026-10-20T09:00:00+05:60").ok).toBe(false);
  });

  it("keeps millisecond precision and truncates finer fractions", () => {
    expect(toEpochMs("2026-10-20T09:00:00.1239+05:30") - toEpochMs("2026-10-20T09:00:00+05:30")).toBe(123);
  });
});

describe("IST display", () => {
  it("renders instants in Asia/Kolkata (+05:30)", () => {
    const ms = toEpochMs("2026-10-20T03:30:00Z");
    expect(toIstIso(ms)).toBe("2026-10-20T09:00:00.000+05:30");
    expect(toIstDisplay(ms)).toBe("20 Oct 2026, 09:00:00 IST");
  });

  it("uses +05:30 year-round (no DST), including across other zones' DST changes", () => {
    for (const utc of ["2026-01-15T00:00:00Z", "2026-03-08T07:00:00Z", "2026-07-15T00:00:00Z", "2026-11-01T06:00:00Z"]) {
      const ms = toEpochMs(utc);
      expect(toIstIso(ms).endsWith("+05:30")).toBe(true);
      expect(toEpochMs(toIstIso(ms))).toBe(ms);
    }
  });

  it("rolls the IST date at 18:30 UTC", () => {
    expect(toIstIso(toEpochMs("2026-12-31T18:29:59Z"))).toBe("2026-12-31T23:59:59.000+05:30");
    expect(toIstIso(toEpochMs("2026-12-31T18:30:00Z"))).toBe("2027-01-01T00:00:00.000+05:30");
  });
});

describe("formatDuration", () => {
  it("formats hours beyond a day and negatives", () => {
    expect(formatDuration(72 * 3_600_000)).toBe("72h 0m 0s");
    expect(formatDuration(-1000)).toBe("-0h 0m 1s");
  });
});
