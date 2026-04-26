import type { Genre, PlacementCount } from "./types";

const PLACEMENT_OFFSET = 1;
const LAST_INDEX = -1;

export function activateAllGenres(): { allGenres: true; selected: Set<Genre> } {
  return { allGenres: true, selected: new Set() };
}

export function nextGenreSelection(
  selected: Set<Genre>,
  allGenres: boolean,
  genre: Genre,
  genres: readonly Genre[],
): { allGenres: boolean; selected: Set<Genre> } {
  if (allGenres) {
    return { allGenres: false, selected: new Set([genre]) };
  }

  const next = new Set(selected);
  if (next.has(genre)) {
    if (next.size === 1) {
      return { allGenres, selected };
    }
    next.delete(genre);
  } else {
    next.add(genre);
    if (next.size === genres.length) {
      return activateAllGenres();
    }
  }

  return { allGenres: false, selected: next };
}

export function clampRangeStart(next: number, rangeEndIdx: number, minDistance: number): number {
  return Math.min(next, rangeEndIdx - minDistance);
}

export function clampRangeEnd(next: number, rangeStartIdx: number, minDistance: number): number {
  return Math.max(next, rangeStartIdx + minDistance);
}

export function moveNearestHandle(
  index: number,
  rangeStartIdx: number,
  rangeEndIdx: number,
  minDistance: number,
): { rangeStartIdx: number; rangeEndIdx: number } {
  const distanceToStart = Math.abs(index - rangeStartIdx);
  const distanceToEnd = Math.abs(index - rangeEndIdx);
  if (distanceToStart <= distanceToEnd) {
    return {
      rangeEndIdx,
      rangeStartIdx: Math.min(index, rangeEndIdx - minDistance),
    };
  }
  return {
    rangeEndIdx: Math.max(index, rangeStartIdx + minDistance),
    rangeStartIdx,
  };
}

export function getAvailablePlacementCounts(
  availableCount: number,
  placementCounts: readonly PlacementCount[],
): PlacementCount[] {
  return placementCounts.filter(
    (count) => availableCount >= count + PLACEMENT_OFFSET,
  ) as PlacementCount[];
}

export function selectPlacementCount(next: PlacementCount, availableCount: number): boolean {
  return availableCount >= next + PLACEMENT_OFFSET;
}

export function normalizePlacementCount(
  placementCount: PlacementCount,
  availablePlacementCounts: readonly PlacementCount[],
  defaultPlacementCount: PlacementCount,
): PlacementCount {
  if (availablePlacementCounts.includes(placementCount)) {
    return placementCount;
  }
  return availablePlacementCounts.at(LAST_INDEX) ?? defaultPlacementCount;
}
