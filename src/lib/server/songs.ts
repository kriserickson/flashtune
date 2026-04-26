import songsRaw from "../data/songs.json";
import {
  type Difficulty,
  GENRES,
  type Genre,
  type Song,
  TIME_SPANS,
  type TimeRange,
  type TimeSpan,
  type YearsBySpanAndGenre,
  getTimeSpansInRange,
} from "../types.ts";

export const ALL_SONGS: Song[] = songsRaw as Song[];

const PIVOT_YEAR = 1950;
const YEAR_1940 = 1940;
const YEAR_1950 = 1950;
const YEAR_1959 = 1959;
const YEAR_1960 = 1960;
const YEAR_1969 = 1969;
const YEAR_1970 = 1970;
const YEAR_1979 = 1979;
const YEAR_1980 = 1980;
const YEAR_1989 = 1989;
const YEAR_1990 = 1990;
const YEAR_1999 = 1999;
const YEAR_2000 = 2000;
const YEAR_2009 = 2009;
const YEAR_2010 = 2010;
const YEAR_2019 = 2019;
const YEAR_2020 = 2020;
const YEAR_2029 = 2029;
const DEFAULT_PICK_COUNT = 10;
const MAX_PICK_ATTEMPTS = 200;
const INDEX_OFFSET = 1;

type GapRule = {
  preGap: number;
  postGap: number;
};

const RULES: Record<Difficulty, GapRule> = {
  easy: { postGap: 10, preGap: 50 },
  hard: { postGap: 0, preGap: 0 },
  medium: { postGap: 5, preGap: 25 },
};

const gapOk = (a: number, b: number, rule: GapRule): boolean => {
  const diff = Math.abs(a - b);
  const both1950Plus = a >= PIVOT_YEAR && b >= PIVOT_YEAR;
  const both1950Minus = a < PIVOT_YEAR && b < PIVOT_YEAR;
  if (both1950Plus) {
    return diff >= rule.postGap;
  }
  if (both1950Minus) {
    return diff >= rule.preGap;
  }
  // Straddles 1950 — use the larger requirement
  return diff >= Math.max(rule.preGap, rule.postGap);
};

const shuffle = <T>(arr: T[]): T[] => {
  const a = arr.slice();
  for (let i = a.length - INDEX_OFFSET; i > 0; i -= INDEX_OFFSET) {
    const j = Math.floor(Math.random() * (i + INDEX_OFFSET));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const inTimeSpan = (year: number, timeSpan: TimeSpan): boolean => {
  switch (timeSpan) {
    case "pre-1950s":
      return year < YEAR_1950;
    case "1940-1950s":
      return year >= YEAR_1940 && year <= YEAR_1959;
    case "1960s":
      return year >= YEAR_1960 && year <= YEAR_1969;
    case "1970s":
      return year >= YEAR_1970 && year <= YEAR_1979;
    case "1980s":
      return year >= YEAR_1980 && year <= YEAR_1989;
    case "1990s":
      return year >= YEAR_1990 && year <= YEAR_1999;
    case "2000s":
      return year >= YEAR_2000 && year <= YEAR_2009;
    case "2010s":
      return year >= YEAR_2010 && year <= YEAR_2019;
    case "2020s":
      return year >= YEAR_2020 && year <= YEAR_2029;
  }
  return false;
};

const uniqueYearPool = (pool: Song[]): Song[] => {
  const seenYears = new Set<number>();
  const unique: Song[] = [];

  for (const song of shuffle(pool)) {
    if (!seenYears.has(song.year)) {
      seenYears.add(song.year);
      unique.push(song);
    }
  }

  return unique;
};

const getPlayablePool = (opts: { genres: Genre[]; timeRange: TimeRange }): Song[] => {
  const selectedSpans = getTimeSpansInRange(opts.timeRange.start, opts.timeRange.end);
  return ALL_SONGS.filter(
    (song) =>
      opts.genres.includes(song.genre) &&
      song.image &&
      selectedSpans.some((span) => inTimeSpan(song.year, span)),
  );
};

const getPlayableYears = (opts: { genres: Genre[]; timeSpan: TimeSpan }): number[] =>
  [
    ...new Set(
      getPlayablePool({
        genres: opts.genres,
        timeRange: { end: opts.timeSpan, start: opts.timeSpan },
      }).map((song) => song.year),
    ),
  ].sort((a, b) => a - b);

const buildYearsBySpanAndGenre = (): YearsBySpanAndGenre => {
  const yearsBySpanAndGenre = {} as YearsBySpanAndGenre;

  for (const timeSpan of TIME_SPANS) {
    yearsBySpanAndGenre[timeSpan] = {} as Record<Genre, number[]>;
    for (const genre of GENRES) {
      yearsBySpanAndGenre[timeSpan][genre] = getPlayableYears({ genres: [genre], timeSpan });
    }
  }

  return yearsBySpanAndGenre;
};

const YEARS_BY_SPAN_AND_GENRE = buildYearsBySpanAndGenre();

export const getYearsBySpanAndGenre = (): YearsBySpanAndGenre => YEARS_BY_SPAN_AND_GENRE;

/**
 * Pick `count` songs whose pairwise year gaps satisfy the difficulty rule.
 * Greedy: shuffle the pool, then accept songs whose year is far enough from
 * every already-picked song. If we can't fill, fall back to relaxed selection.
 */
export const pickRound = (opts: {
  genres: Genre[];
  difficulty: Difficulty;
  timeRange: TimeRange;
  count?: number;
}): Song[] => {
  const count = opts.count ?? DEFAULT_PICK_COUNT;
  const rule = RULES[opts.difficulty];
  const pool = getPlayablePool(opts);
  const uniqueYears = uniqueYearPool(pool);

  if (uniqueYears.length < count) {
    return uniqueYears.slice(0, count);
  }

  for (let attempt = 0; attempt < MAX_PICK_ATTEMPTS; attempt += INDEX_OFFSET) {
    const shuffled = uniqueYearPool(pool);
    const picked: Song[] = [];
    for (const song of shuffled) {
      if (picked.every((p) => gapOk(p.year, song.year, rule))) {
        picked.push(song);
        if (picked.length === count) {
          break;
        }
      }
    }
    if (picked.length === count) {
      return picked;
    }
  }

  // Couldn't satisfy gaps — fall back to a sparse-as-possible greedy pick
  return greedySpread(uniqueYears, count);
};

const greedySpread = (pool: Song[], count: number): Song[] => {
  const sorted = pool.slice().sort((a, b) => a.year - b.year);
  if (sorted.length <= count) {
    return shuffle(sorted);
  }
  const step = (sorted.length - INDEX_OFFSET) / (count - INDEX_OFFSET);
  const picked: Song[] = [];
  for (let i = 0; i < count; i += INDEX_OFFSET) {
    picked.push(sorted[Math.round(i * step)]);
  }
  return shuffle(picked);
};
