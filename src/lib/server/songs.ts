import songsRaw from '../data/songs.json';
import type { Difficulty, Genre, Song } from '../types.ts';

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

/**
 * Pick `count` songs whose pairwise year gaps satisfy the difficulty rule.
 * Greedy: shuffle the pool, then accept songs whose year is far enough from
 * every already-picked song. If we can't fill, fall back to relaxed selection.
 */
export function pickRound(opts: {
	genres: Genre[];
	difficulty: Difficulty;
	count?: number;
}): Song[] {
	const count = opts.count ?? 10;
	const rule = RULES[opts.difficulty];
	const pool = ALL_SONGS.filter((s) => opts.genres.includes(s.genre) && s.image);

	if (pool.length < count) return shuffle(pool).slice(0, count);

	for (let attempt = 0; attempt < 200; attempt++) {
		const shuffled = shuffle(pool);
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
	return greedySpread(pool, count);
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
