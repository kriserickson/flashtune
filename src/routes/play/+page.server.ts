import { error } from '@sveltejs/kit';
import { pickRound } from '$lib/server/songs.ts';
import { GENRES, type Difficulty, type Genre } from '$lib/types.ts';
import type { PageServerLoad } from './$types.ts';

const DIFFS = new Set<Difficulty>(['easy', 'medium', 'hard']);
const GENRE_SET = new Set<Genre>(GENRES);

export const load: PageServerLoad = async ({ url }) => {
	const d = url.searchParams.get('d') as Difficulty | null;
	const gParam = url.searchParams.get('g') ?? '';

	const difficulty: Difficulty = d && DIFFS.has(d) ? d : 'medium';
	const genres = gParam
		.split(',')
		.map((s) => s.trim())
		.filter((s): s is Genre => GENRE_SET.has(s as Genre));

	const finalGenres = genres.length > 0 ? genres : [...GENRES];

	// 11 songs = 1 seed + 10 placements scored
	const songs = pickRound({ difficulty, genres: finalGenres, count: 11 });
	if (songs.length < 2) throw error(500, 'Could not pick a round');

	return {
		round: { songs, difficulty, genres: finalGenres }
	};
};
