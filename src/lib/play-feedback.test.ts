import { describe, expect, it } from "vitest";
import { getSuccessMessage, verdict } from "./play-feedback";

const song = { year: 1995, title: "Test Track", artist: "Test Artist" };

describe("getSuccessMessage", () => {
  it("returns a deterministic message for the same song seed", () => {
    const first = getSuccessMessage(song);
    expect(getSuccessMessage(song)).toBe(first);
  });

  it("returns a non-empty string for a success message", () => {
    expect(getSuccessMessage(song)).toBeTypeOf("string");
    expect(getSuccessMessage(song).length).toBeGreaterThan(0);
  });
});

describe("verdict", () => {
  it("returns a deterministic result copy for the same score and total", () => {
    const first = verdict(4, 5);
    expect(verdict(4, 5)).toEqual(first);
  });

  it("returns distinct verdicts for a perfect score and a low score", () => {
    const perfect = verdict(5, 5);
    const poor = verdict(1, 5);
    expect(perfect).not.toEqual(poor);
    expect(perfect.headline).toBeTypeOf("string");
    expect(poor.comment).toBeTypeOf("string");
  });
});
