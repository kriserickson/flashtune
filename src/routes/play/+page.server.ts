import { error } from "@sveltejs/kit";
import {
  DEFAULT_PLACEMENT_COUNT,
  type Difficulty,
  GENRES,
  type Genre,
  PLACEMENT_COUNTS,
  type PlacementCount,
  TIME_SPANS,
  type TimeSpan,
  normalizeTimeRange,
} from "$lib/types.ts";
import { pickRound } from "$lib/server/songs.ts";
import type { PageServerLoad } from "./$types.ts";

const DIFFS = new Set<Difficulty>(["easy", "medium", "hard"]);
const GENRE_SET = new Set<Genre>(GENRES);
const TIME_SPAN_SET = new Set<TimeSpan>(TIME_SPANS);
const PLACEMENT_COUNT_SET = new Set<number>(PLACEMENT_COUNTS);
const DEFAULT_DIFFICULTY: Difficulty = "medium";
const DEFAULT_TIME_RANGE_START: TimeSpan = "pre-1950s";
const DEFAULT_TIME_RANGE_END: TimeSpan = "2020s";
const REQUESTED_SONG_COUNT_INCREMENT = 1;
const BAD_REQUEST_STATUS = 400;

export const load: PageServerLoad = async ({ url }) => {
  const d = url.searchParams.get("d") as Difficulty | null;
  const gParam = url.searchParams.get("g") ?? "";
  const ts = url.searchParams.get("ts") as TimeSpan | null;
  const te = url.searchParams.get("te") as TimeSpan | null;
  const c = Number(url.searchParams.get("c"));

  let difficulty: Difficulty = DEFAULT_DIFFICULTY;
  if (d && DIFFS.has(d)) {
    difficulty = d;
  }

  let rawStart: TimeSpan = DEFAULT_TIME_RANGE_START;
  if (ts && TIME_SPAN_SET.has(ts)) {
    rawStart = ts;
  }

  let rawEnd: TimeSpan = DEFAULT_TIME_RANGE_END;
  if (te && TIME_SPAN_SET.has(te)) {
    rawEnd = te;
  }

  let placementCount: PlacementCount = DEFAULT_PLACEMENT_COUNT;
  if (PLACEMENT_COUNT_SET.has(c)) {
    placementCount = c as PlacementCount;
  }
  const timeRange = normalizeTimeRange({ end: rawEnd, start: rawStart });
  const genres = gParam
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Genre => GENRE_SET.has(s as Genre));

  let finalGenres = [...GENRES];
  if (genres.length > 0) {
    finalGenres = genres;
  }
  const requestedSongCount = placementCount + REQUESTED_SONG_COUNT_INCREMENT;

  const songs = pickRound({
    count: requestedSongCount,
    difficulty,
    genres: finalGenres,
    timeRange,
  });
  if (songs.length < requestedSongCount) {
    throw error(
      BAD_REQUEST_STATUS,
      `Need at least ${requestedSongCount} songs for the selected filters`,
    );
  }

  return {
    round: { difficulty, genres: finalGenres, songs, timeRange },
  };
};
