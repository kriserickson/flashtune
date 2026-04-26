import type { Song } from "./types";

export function computeCorrectIndex(arr: Song[], year: number): number {
  let i = 0;
  while (i < arr.length && arr[i].year < year) {
    i++;
  }
  return i;
}

export function isPositionCorrect(arr: Song[], chosen: number, year: number): boolean {
  const before = arr[chosen - 1];
  const after = arr[chosen];
  const okBefore = !before || before.year <= year;
  const okAfter = !after || year <= after.year;
  return okBefore && okAfter;
}
