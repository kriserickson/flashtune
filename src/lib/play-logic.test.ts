import { describe, expect, it } from 'vitest';
import type { Song } from './types';
import { computeCorrectIndex, isPositionCorrect } from './play-logic';

const songs: Song[] = [
	{ id: 'a', title: 'Song A', artist: 'Artist A', year: 1960, genre: 'rock', image: null, wikipediaUrl: null },
	{ id: 'b', title: 'Song B', artist: 'Artist B', year: 1970, genre: 'pop', image: null, wikipediaUrl: null },
	{ id: 'c', title: 'Song C', artist: 'Artist C', year: 1980, genre: 'jazz', image: null, wikipediaUrl: null }
];

describe('computeCorrectIndex', () => {
	it('returns the first index where the year should be inserted', () => {
		expect(computeCorrectIndex(songs, 1955)).toBe(0);
		expect(computeCorrectIndex(songs, 1965)).toBe(1);
		expect(computeCorrectIndex(songs, 1970)).toBe(1);
		expect(computeCorrectIndex(songs, 1990)).toBe(3);
	});
});

describe('isPositionCorrect', () => {
	it('returns true when song placement fits between surrounding years', () => {
		expect(isPositionCorrect(songs, 1, 1965)).toBe(true);
		expect(isPositionCorrect(songs, 2, 1975)).toBe(true);
	});

	it('returns false when placement violates the year order', () => {
		expect(isPositionCorrect(songs, 1, 1950)).toBe(false);
		expect(isPositionCorrect(songs, 2, 1985)).toBe(false);
	});
});
