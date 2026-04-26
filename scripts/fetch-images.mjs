#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEDS = resolve(__dirname, 'seeds.json');
const OUT = resolve(__dirname, '..', 'src', 'lib', 'data', 'songs.json');
const CACHE = resolve(__dirname, '.cache.json');

const UA = 'flashtune/0.1 (https://github.com/local; learning project) node-fetch';
const TITLE_SLICE_LENGTH = 40;
const CACHE_SAVE_INTERVAL = 25;
const JSON_SPACES = '\t';
const SEARCH_RESULT_INDEX = 1;
const SEARCH_TITLE_INDEX = 0;

const restUrl = (title) =>
	`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`;
const searchUrl = (query) =>
	`https://en.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&search=${encodeURIComponent(query)}`;

const loadCache = () => {
	if (existsSync(CACHE)) {
		return JSON.parse(readFileSync(CACHE, 'utf8'));
	}

	return {};
};

const cache = loadCache();

const getSummary = async (title) => {
	const url = restUrl(title);
	const response = await fetch(url, { headers: { 'User-Agent': UA, accept: 'application/json' } });
	if (!response.ok) return null;
	const data = await response.json();
	if (data.type === 'disambiguation') return null;
	return data;
};

const searchTitle = async (query) => {
	const response = await fetch(searchUrl(query), { headers: { 'User-Agent': UA } });
	if (!response.ok) return null;
	const data = await response.json();
	return data?.[SEARCH_RESULT_INDEX]?.[SEARCH_TITLE_INDEX] ?? null;
};

const resolve1 = async (seed) => {
	const cacheKey = `${seed.title}__${seed.artist}`;
	if (cache[cacheKey]?.image) return cache[cacheKey];

	let summary = await getSummary(seed.wikipediaTitle ?? seed.title);
	if (!summary?.thumbnail) {
		const found = await searchTitle(`${seed.title} ${seed.artist}`);
		if (found) {
			const s2 = await getSummary(found);
			if (s2?.thumbnail) summary = s2;
			else if (!summary) summary = s2;
		}
	}
	if (!summary) {
		const found = await searchTitle(`${seed.title} song`);
		if (found) summary = await getSummary(found);
	}

	let imageFallback = null;
	if (!summary?.thumbnail) {
		const artistSummary = await getSummary(seed.artist);
		if (artistSummary?.thumbnail) {
			imageFallback = {
				height: artistSummary.thumbnail.height,
				source: artistSummary.thumbnail.source,
				width: artistSummary.thumbnail.width
			};
		}
	}

	const thumb = summary?.thumbnail ?? imageFallback;
	const result = {
		image: thumb?.source ?? null,
		imageHeight: thumb?.height ?? null,
		imageWidth: thumb?.width ?? null,
		resolvedTitle: summary?.title ?? null,
		wikipediaUrl: summary?.content_urls?.desktop?.page ?? null
	};

	cache[cacheKey] = result;
	return result;
}

const seeds = JSON.parse(readFileSync(SEEDS, 'utf8'));
const out = [];
const INITIAL_COUNTER = 0;
let i = INITIAL_COUNTER;
let missing = INITIAL_COUNTER;
for (const seed of seeds) {
	i += 1;
	process.stdout.write(`\r[${i}/${seeds.length}] ${seed.title.slice(0, TITLE_SLICE_LENGTH).padEnd(TITLE_SLICE_LENGTH)}`);
	try {
		const meta = await resolve1(seed);
		if (!meta.image) missing++;
		out.push({
			artist: seed.artist,
			genre: seed.genre,
			id: `${slugify(seed.artist)}-${slugify(seed.title)}-${seed.year}`,
			image: meta.image,
			imageHeight: meta.imageHeight,
			imageWidth: meta.imageWidth,
			title: seed.title,
			wikipediaUrl: meta.wikipediaUrl,
			year: seed.year
		});
	} catch (err) {
		missing++;
		console.error(`\n  ! ${seed.title}: ${err.message}`);
		out.push({
			artist: seed.artist,
			genre: seed.genre,
			id: `${slugify(seed.artist)}-${slugify(seed.title)}-${seed.year}`,
			image: null,
			title: seed.title,
			wikipediaUrl: null,
			year: seed.year
		});
	}
	if (i % CACHE_SAVE_INTERVAL === 0) writeFileSync(CACHE, JSON.stringify(cache, null, JSON_SPACES));
}

writeFileSync(CACHE, JSON.stringify(cache, null, JSON_SPACES));
writeFileSync(OUT, JSON.stringify(out, null, JSON_SPACES));
console.log(`\n\nWrote ${out.length} songs to ${OUT}`);
console.log(`Missing images: ${missing}`);

function slugify(s) {
	return s
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}
