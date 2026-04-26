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
	blues: 'Blues',
	classical: 'Classical',
	country: 'Country',
	'hip-hop': 'Hip-Hop',
	jazz: 'Jazz',
	pop: 'Pop',
	rock: 'Rock'
};

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
	easy: 'Easy',
	hard: 'Hard',
	medium: 'Medium'
};

export const DIFFICULTY_DESC: Record<Difficulty, string> = {
	easy: '10+ years apart (50+ before 1950)',
	hard: 'Any spacing',
	medium: '5+ years apart (25+ before 1950)'
};

export const PLACEMENT_COUNT_10 = 10 as const;
export const PLACEMENT_COUNT_15 = 15 as const;
export const PLACEMENT_COUNT_20 = 20 as const;
export const PLACEMENT_COUNT_25 = 25 as const;

export type PlacementCount =
	typeof PLACEMENT_COUNT_10 |
	typeof PLACEMENT_COUNT_15 |
	typeof PLACEMENT_COUNT_20 |
	typeof PLACEMENT_COUNT_25;

export const PLACEMENT_COUNTS: readonly PlacementCount[] = [
	PLACEMENT_COUNT_10,
	PLACEMENT_COUNT_15,
	PLACEMENT_COUNT_20,
	PLACEMENT_COUNT_25
] as const;

export const DEFAULT_PLACEMENT_COUNT: PlacementCount = PLACEMENT_COUNT_10;

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
	'1940-1950s': '1940s & 1950s',
	'1960s': '1960s',
	'1970s': '1970s',
	'1980s': '1980s',
	'1990s': '1990s',
	'2000s': '2000s',
	'2010s': '2010s',
	'2020s': '2020s',
	'pre-1950s': 'Pre-1950s'
};

export const TIME_SPAN_SHORT_LABEL: Record<TimeSpan, string> = {
	'1940-1950s': '40/50',
	'1960s': '60s',
	'1970s': '70s',
	'1980s': '80s',
	'1990s': '90s',
	'2000s': '00s',
	'2010s': '10s',
	'2020s': '20s',
	'pre-1950s': 'Pre-50'
};

export const TIME_SPAN_DESC: Record<TimeSpan, string> = {
	'1940-1950s': '1940-1959',
	'1960s': '1960-1969',
	'1970s': '1970-1979',
	'1980s': '1980-1989',
	'1990s': '1990-1999',
	'2000s': '2000-2009',
	'2010s': '2010-2019',
	'2020s': '2020-2029',
	'pre-1950s': 'Before 1950'
};

export type TimeRange = {
	start: TimeSpan;
	end: TimeSpan;
}

export const MIN_TIME_SPAN_COUNT = 2;

export type YearsBySpanAndGenre = Record<TimeSpan, Record<Genre, number[]>>;

const SLICE_RANGE_OFFSET = 1;
const FIRST_INDEX = 0;

export const getTimeSpansInRange = (start: TimeSpan, end: TimeSpan): TimeSpan[] => {
	const startIndex = TIME_SPANS.indexOf(start);
	const endIndex = TIME_SPANS.indexOf(end);
	const from = Math.min(startIndex, endIndex);
	const to = Math.max(startIndex, endIndex);
	return TIME_SPANS.slice(from, to + SLICE_RANGE_OFFSET);
};

export const normalizeTimeRange = (range: TimeRange): TimeRange => {
	const spans = getTimeSpansInRange(range.start, range.end);
	if (spans.length >= MIN_TIME_SPAN_COUNT) {
		return { end: spans[spans.length - SLICE_RANGE_OFFSET], start: spans[FIRST_INDEX] };
	}

	const index = TIME_SPANS.indexOf(spans[FIRST_INDEX]);
	const safeStart = Math.max(FIRST_INDEX, Math.min(index, TIME_SPANS.length - MIN_TIME_SPAN_COUNT));
	return {
		end: TIME_SPANS[safeStart + MIN_TIME_SPAN_COUNT - SLICE_RANGE_OFFSET],
		start: TIME_SPANS[safeStart]
	};
};

export const formatTimeRange = (range: TimeRange): string => {
	if (range.start === range.end) {
		return TIME_SPAN_LABEL[range.start];
	}

	return `${TIME_SPAN_LABEL[range.start]} to ${TIME_SPAN_LABEL[range.end]}`;
};

export type Song = {
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

export type Round = {
	songs: Song[];
	difficulty: Difficulty;
	genres: Genre[];
	timeRange: TimeRange;
}

export type Placement = {
	song: Song;
	guessedIndex: number;
	correct: boolean;
}
