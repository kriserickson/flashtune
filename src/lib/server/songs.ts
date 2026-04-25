import songsRaw from '../data/songs.json';
import {
	GENRES,
	TIME_SPANS,
	getTimeSpansInRange,
	type Difficulty,
	type Genre,
	type Song,
	type TimeRange,
	type TimeSpan,
	type YearsBySpanAndGenre
} from '../types.ts';

export const ALL_SONGS: Song[] = songsRaw as Song[];

const PIVOT_YEAR = 1950;

interface GapRule {
	preGap: number;
	postGap: number;
}

const RULES: Record<Difficulty, GapRule> = {
	easy: { preGap: 50, postGap: 10 },
	medium: { preGap: 25, postGap: 5 },
	hard: { preGap: 0, postGap: 0 }
};

function gapOk(a: number, b: number, rule: GapRule): boolean {
	const diff = Math.abs(a - b);
	const both1950Plus = a >= PIVOT_YEAR && b >= PIVOT_YEAR;
	const both1950Minus = a < PIVOT_YEAR && b < PIVOT_YEAR;
	if (both1950Plus) return diff >= rule.postGap;
	if (both1950Minus) return diff >= rule.preGap;
	// straddles 1950 — use the larger requirement
	return diff >= Math.max(rule.preGap, rule.postGap);
}

function shuffle<T>(arr: T[]): T[] {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function inTimeSpan(year: number, timeSpan: TimeSpan): boolean {
	switch (timeSpan) {
		case 'pre-1950s':
			return year < 1950;
		case '1940-1950s':
			return year >= 1940 && year <= 1959;
		case '1960s':
			return year >= 1960 && year <= 1969;
		case '1970s':
			return year >= 1970 && year <= 1979;
		case '1980s':
			return year >= 1980 && year <= 1989;
		case '1990s':
			return year >= 1990 && year <= 1999;
		case '2000s':
			return year >= 2000 && year <= 2009;
		case '2010s':
			return year >= 2010 && year <= 2019;
		case '2020s':
			return year >= 2020 && year <= 2029;
	}
}


function uniqueYearPool(pool: Song[]): Song[] {
	const seenYears = new Set<number>();
	const unique: Song[] = [];

	for (const song of shuffle(pool)) {
		if (seenYears.has(song.year)) continue;
		seenYears.add(song.year);
		unique.push(song);
	}

	return unique;
}

function getPlayablePool(opts: { genres: Genre[]; timeRange: TimeRange }): Song[] {
	const selectedSpans = getTimeSpansInRange(opts.timeRange.start, opts.timeRange.end);
	return ALL_SONGS.filter(
		(song) =>
			opts.genres.includes(song.genre) &&
			song.image &&
			selectedSpans.some((span) => inTimeSpan(song.year, span))
	);
}

function getPlayableYears(opts: { genres: Genre[]; timeSpan: TimeSpan }): number[] {
	return [...new Set(getPlayablePool({ genres: opts.genres, timeRange: { start: opts.timeSpan, end: opts.timeSpan } }).map((song) => song.year))].sort(
		(a, b) => a - b
	);
}

function buildYearsBySpanAndGenre(): YearsBySpanAndGenre {
	const yearsBySpanAndGenre = {} as YearsBySpanAndGenre;

	for (const timeSpan of TIME_SPANS) {
		yearsBySpanAndGenre[timeSpan] = {} as Record<Genre, number[]>;
		for (const genre of GENRES) {
			yearsBySpanAndGenre[timeSpan][genre] = getPlayableYears({ genres: [genre], timeSpan });
		}
	}

	return yearsBySpanAndGenre;
}

const YEARS_BY_SPAN_AND_GENRE = buildYearsBySpanAndGenre();

export function getYearsBySpanAndGenre(): YearsBySpanAndGenre {
	return YEARS_BY_SPAN_AND_GENRE;
}

/**
 * Pick `count` songs whose pairwise year gaps satisfy the difficulty rule.
 * Greedy: shuffle the pool, then accept songs whose year is far enough from
 * every already-picked song. If we can't fill, fall back to relaxed selection.
 */
export function pickRound(opts: {
	genres: Genre[];
	difficulty: Difficulty;
	timeRange: TimeRange;
	count?: number;
}): Song[] {
	const count = opts.count ?? 10;
	const rule = RULES[opts.difficulty];
	const pool = getPlayablePool(opts);
	const uniqueYears = uniqueYearPool(pool);

	if (uniqueYears.length < count) return uniqueYears.slice(0, count);

	for (let attempt = 0; attempt < 200; attempt++) {
		const shuffled = uniqueYearPool(pool);
		const picked: Song[] = [];
		for (const song of shuffled) {
			if (picked.every((p) => gapOk(p.year, song.year, rule))) {
				picked.push(song);
				if (picked.length === count) break;
			}
		}
		if (picked.length === count) return picked;
	}

	// Couldn't satisfy gaps — fall back to a sparse-as-possible greedy pick
	return greedySpread(uniqueYears, count);
}

function greedySpread(pool: Song[], count: number): Song[] {
	const sorted = pool.slice().sort((a, b) => a.year - b.year);
	if (sorted.length <= count) return shuffle(sorted);
	const step = (sorted.length - 1) / (count - 1);
	const picked: Song[] = [];
	for (let i = 0; i < count; i++) {
		picked.push(sorted[Math.round(i * step)]);
	}
	return shuffle(picked);
}
