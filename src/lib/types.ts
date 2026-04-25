export type Genre = 'classical' | 'jazz' | 'blues' | 'rock' | 'pop' | 'hip-hop' | 'country';

export const GENRES: readonly Genre[] = [
	'classical',
	'jazz',
	'blues',
	'rock',
	'pop',
	'hip-hop',
	'country'
] as const;

export const GENRE_LABEL: Record<Genre, string> = {
	classical: 'Classical',
	jazz: 'Jazz',
	blues: 'Blues',
	rock: 'Rock',
	pop: 'Pop',
	'hip-hop': 'Hip-Hop',
	country: 'Country'
};

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
	easy: 'Easy',
	medium: 'Medium',
	hard: 'Hard'
};

export const DIFFICULTY_DESC: Record<Difficulty, string> = {
	easy: '10+ years apart (50+ before 1950)',
	medium: '5+ years apart (25+ before 1950)',
	hard: 'Any spacing'
};

export type PlacementCount = 10 | 15 | 20 | 25;

export const PLACEMENT_COUNTS: readonly PlacementCount[] = [10, 15, 20, 25] as const;

export const DEFAULT_PLACEMENT_COUNT: PlacementCount = 10;

export type TimeSpan =
	| 'pre-1950s'
	| '1940-1950s'
	| '1960s'
	| '1970s'
	| '1980s'
	| '1990s'
	| '2000s'
	| '2010s'
	| '2020s';

export const TIME_SPANS: readonly TimeSpan[] = [
	'pre-1950s',
	'1940-1950s',
	'1960s',
	'1970s',
	'1980s',
	'1990s',
	'2000s',
	'2010s',
	'2020s'
] as const;

export const TIME_SPAN_LABEL: Record<TimeSpan, string> = {
	'pre-1950s': 'Pre-1950s',
	'1940-1950s': '1940s & 1950s',
	'1960s': '1960s',
	'1970s': '1970s',
	'1980s': '1980s',
	'1990s': '1990s',
	'2000s': '2000s',
	'2010s': '2010s',
	'2020s': '2020s'
};

export const TIME_SPAN_SHORT_LABEL: Record<TimeSpan, string> = {
	'pre-1950s': 'Pre-50',
	'1940-1950s': '40/50',
	'1960s': '60s',
	'1970s': '70s',
	'1980s': '80s',
	'1990s': '90s',
	'2000s': '00s',
	'2010s': '10s',
	'2020s': '20s'
};

export const TIME_SPAN_DESC: Record<TimeSpan, string> = {
	'pre-1950s': 'Before 1950',
	'1940-1950s': '1940-1959',
	'1960s': '1960-1969',
	'1970s': '1970-1979',
	'1980s': '1980-1989',
	'1990s': '1990-1999',
	'2000s': '2000-2009',
	'2010s': '2010-2019',
	'2020s': '2020-2029'
};

export interface TimeRange {
	start: TimeSpan;
	end: TimeSpan;
}

export const MIN_TIME_SPAN_COUNT = 2;

export type YearsBySpanAndGenre = Record<TimeSpan, Record<Genre, number[]>>;

export function getTimeSpansInRange(start: TimeSpan, end: TimeSpan): TimeSpan[] {
	const startIndex = TIME_SPANS.indexOf(start);
	const endIndex = TIME_SPANS.indexOf(end);
	const from = Math.min(startIndex, endIndex);
	const to = Math.max(startIndex, endIndex);
	return TIME_SPANS.slice(from, to + 1);
}

export function normalizeTimeRange(range: TimeRange): TimeRange {
	const spans = getTimeSpansInRange(range.start, range.end);
	if (spans.length >= MIN_TIME_SPAN_COUNT) {
		return { start: spans[0], end: spans[spans.length - 1] };
	}

	const index = TIME_SPANS.indexOf(spans[0]);
	const safeStart = Math.max(0, Math.min(index, TIME_SPANS.length - MIN_TIME_SPAN_COUNT));
	return {
		start: TIME_SPANS[safeStart],
		end: TIME_SPANS[safeStart + MIN_TIME_SPAN_COUNT - 1]
	};
}

export function formatTimeRange(range: TimeRange): string {
	return range.start === range.end
		? TIME_SPAN_LABEL[range.start]
		: `${TIME_SPAN_LABEL[range.start]} to ${TIME_SPAN_LABEL[range.end]}`;
}

export interface Song {
	id: string;
	title: string;
	artist: string;
	year: number;
	genre: Genre;
	image: string | null;
	imageWidth?: number | null;
	imageHeight?: number | null;
	wikipediaUrl: string | null;
}

export interface Round {
	songs: Song[];
	difficulty: Difficulty;
	genres: Genre[];
	timeRange: TimeRange;
}

export interface Placement {
	song: Song;
	guessedIndex: number;
	correct: boolean;
}
