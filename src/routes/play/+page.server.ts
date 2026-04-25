import { error } from '@sveltejs/kit';
import { pickRound } from '$lib/server/songs.ts';
import {
	GENRES,
	normalizeTimeRange,
	TIME_SPANS,
	type Difficulty,
	type Genre,
	type TimeSpan
} from '$lib/types.ts';
import type { PageServerLoad } from './$types.ts';

const DIFFS = new Set<Difficulty>(['easy', 'medium', 'hard']);
const GENRE_SET = new Set<Genre>(GENRES);
const TIME_SPAN_SET = new Set<TimeSpan>(TIME_SPANS);

export const load: PageServerLoad = async ({ url }) => {
	const d = url.searchParams.get('d') as Difficulty | null;
	const gParam = url.searchParams.get('g') ?? '';
	const ts = url.searchParams.get('ts') as TimeSpan | null;
	const te = url.searchParams.get('te') as TimeSpan | null;

	const difficulty: Difficulty = d && DIFFS.has(d) ? d : 'medium';
	const rawStart: TimeSpan = ts && TIME_SPAN_SET.has(ts) ? ts : 'pre-1950s';
	const rawEnd: TimeSpan = te && TIME_SPAN_SET.has(te) ? te : '2020s';
	const timeRange = normalizeTimeRange({ start: rawStart, end: rawEnd });
	const genres = gParam
		.split(',')
		.map((s) => s.trim())
		.filter((s): s is Genre => GENRE_SET.has(s as Genre));

	const finalGenres = genres.length > 0 ? genres : [...GENRES];

	// 11 songs = 1 seed + 10 placements scored
	const songs = pickRound({ difficulty, genres: finalGenres, timeRange, count: 11 });
	if (songs.length < 2) throw error(400, 'Need at least 2 songs for the selected filters');

	return {
		round: { songs, difficulty, genres: finalGenres, timeRange }
	};
};
