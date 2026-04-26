import { describe, expect, it } from "vitest";
import type { Genre, PlacementCount } from "./types";
import {
  activateAllGenres,
  nextGenreSelection,
  clampRangeStart,
  clampRangeEnd,
  moveNearestHandle,
  getAvailablePlacementCounts,
  selectPlacementCount,
  normalizePlacementCount,
} from "./settings-logic";

const genres = ["rock", "pop", "jazz"] as const satisfies readonly Genre[];
const availablePlacementCounts = [10, 15, 20] as const satisfies readonly PlacementCount[];

describe("activateAllGenres", () => {
  it("enables all genres and returns an empty selected set", () => {
    const result = activateAllGenres();
    expect(result.allGenres).toBe(true);
    expect(result.selected.size).toBe(0);
  });
});

describe("nextGenreSelection", () => {
  it("switches off allGenres when selecting a genre", () => {
    const result = nextGenreSelection(new Set(), true, "rock", genres);
    expect(result.allGenres).toBe(false);
    expect(result.selected.has("rock")).toBe(true);
  });

  it("removes a genre when toggled off and leaves others intact", () => {
    const result = nextGenreSelection(new Set(["rock", "pop"]), false, "rock", genres);
    expect(result.selected.has("rock")).toBe(false);
    expect(result.selected.has("pop")).toBe(true);
  });

  it("activates all genres when the last remaining genre is selected", () => {
    const result = nextGenreSelection(new Set(["rock", "pop"]), false, "jazz", genres);
    expect(result.allGenres).toBe(true);
    expect(result.selected.size).toBe(0);
  });
});

describe("range helpers", () => {
  it("clamps the start index so the range keeps the minimum distance", () => {
    expect(clampRangeStart(5, 8, 3)).toBe(5);
    expect(clampRangeStart(7, 8, 3)).toBe(5);
  });

  it("clamps the end index so the range keeps the minimum distance", () => {
    expect(clampRangeEnd(2, 0, 3)).toBe(3);
    expect(clampRangeEnd(5, 2, 3)).toBe(5);
  });

  it("moves the nearest handle toward the given index", () => {
    expect(moveNearestHandle(2, 0, 7, 3)).toEqual({ rangeStartIdx: 2, rangeEndIdx: 7 });
    expect(moveNearestHandle(6, 0, 7, 3)).toEqual({ rangeStartIdx: 0, rangeEndIdx: 6 });
  });
});

describe("placement count helpers", () => {
  it("returns only placement counts that fit in the available count", () => {
    expect(getAvailablePlacementCounts(17, availablePlacementCounts)).toEqual([10, 15]);
  });

  it("validates whether a placement count can be selected", () => {
    expect(selectPlacementCount(15, 16)).toBe(true);
    expect(selectPlacementCount(20, 16)).toBe(false);
  });

  it("normalizes a placement count to the last available or default option", () => {
    expect(normalizePlacementCount(15, availablePlacementCounts, 10)).toBe(15);
    expect(normalizePlacementCount(25 as PlacementCount, availablePlacementCounts, 10)).toBe(20);
  });
});
