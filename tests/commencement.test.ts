import { describe, expect, it } from "vitest";
import { addCalendarMonths, commencementBanner } from "../src/core/commencement";

describe("commencementBanner", () => {
  it("computes the date and states the assumption (AMB-14)", () => {
    const b = commencementBanner();
    expect(b.publicationDate).toBe("2025-11-13");
    expect(b.computedDate).toBe("2027-05-13");
    expect(b.computedStart).toBe("2027-05-13T00:00:00.000+05:30");
    expect(b.assumption).toContain("18 calendar months");
    expect(b.banner).toContain("Not a date stated in the Rules");
    expect(b.alternatives[0]).toMatch(/^2027-05-14/);
    expect(b.interpretation.map((i) => i.ambiguityId)).toEqual(["AMB-14"]);
    expect(b.status).toBeNull();
  });

  it("switches at 00:00 IST on the computed date, whatever offset 'now' uses", () => {
    expect(commencementBanner("2026-10-22T12:00:00+05:30").status).toBe("before_computed_date");
    expect(commencementBanner("2027-05-12T18:29:59Z").status).toBe("before_computed_date");
    expect(commencementBanner("2027-05-12T18:30:00Z").status).toBe("on_or_after_computed_date");
    expect(commencementBanner("2027-05-13T00:00:00+05:30").status).toBe("on_or_after_computed_date");
  });
});

describe("addCalendarMonths", () => {
  it("clamps to the end of shorter months", () => {
    expect(addCalendarMonths("2025-08-31", 6)).toBe("2026-02-28");
    expect(addCalendarMonths("2027-08-31", 6)).toBe("2028-02-29");
  });
});
