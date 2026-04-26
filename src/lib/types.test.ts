import { describe, expect, it } from "vitest";
import { getTimeSpansInRange, normalizeTimeRange, formatTimeRange } from "./types";

describe("getTimeSpansInRange", () => {
  it("returns a contiguous list of time spans between start and end", () => {
    expect(getTimeSpansInRange("1960s", "1980s")).toEqual(["1960s", "1970s", "1980s"]);
    expect(getTimeSpansInRange("1980s", "1960s")).toEqual(["1960s", "1970s", "1980s"]);
  });
});

describe("normalizeTimeRange", () => {
  it("uses the provided range if it already covers at least two spans", () => {
    const normalized = normalizeTimeRange({ start: "1960s", end: "1980s" });
    expect(normalized).toEqual({ start: "1960s", end: "1980s" });
  });

  it("expands a single-span range to include at least two spans", () => {
    const normalized = normalizeTimeRange({ start: "1980s", end: "1980s" });
    expect(normalized).toEqual({ start: "1980s", end: "1990s" });
  });
});

describe("formatTimeRange", () => {
  it("formats a single time span with its label", () => {
    expect(formatTimeRange({ start: "2000s", end: "2000s" })).toBe("2000s");
  });

  it("formats a multi-span range using start and end labels", () => {
    expect(formatTimeRange({ start: "1960s", end: "1980s" })).toBe("1960s to 1980s");
  });
});
