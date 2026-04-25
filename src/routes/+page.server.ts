import { getYearsBySpanAndGenre } from '$lib/server/songs.ts';
import type { PageServerLoad } from './$types.ts';

export const load: PageServerLoad = async () => {
	return {
		yearsBySpanAndGenre: getYearsBySpanAndGenre()
	};
};