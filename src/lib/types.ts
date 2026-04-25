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
}

export interface Placement {
	song: Song;
	guessedIndex: number;
	correct: boolean;
}
