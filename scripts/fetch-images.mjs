#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEDS = resolve(__dirname, 'seeds.json');
const OUT = resolve(__dirname, '..', 'src', 'lib', 'data', 'songs.json');
const CACHE = resolve(__dirname, '.cache.json');

const UA = 'flashtune/0.1 (https://github.com/local; learning project) node-fetch';
const REST = (title) =>
	`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`;
const SEARCH = (q) =>
	`https://en.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&search=${encodeURIComponent(q)}`;

const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

async function getSummary(title) {
	const url = REST(title);
	const r = await fetch(url, { headers: { 'User-Agent': UA, accept: 'application/json' } });
	if (!r.ok) return null;
	const data = await r.json();
	if (data.type === 'disambiguation') return null;
	return data;
}

async function searchTitle(query) {
	const r = await fetch(SEARCH(query), { headers: { 'User-Agent': UA } });
	if (!r.ok) return null;
	const data = await r.json();
	return data?.[1]?.[0] ?? null;
}

async function resolve1(seed) {
	const cacheKey = `${seed.title}__${seed.artist}`;
	if (cache[cacheKey] && cache[cacheKey].image) return cache[cacheKey];

	let summary = await getSummary(seed.wikipediaTitle ?? seed.title);
	if (!summary || !summary.thumbnail) {
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
				source: artistSummary.thumbnail.source,
				width: artistSummary.thumbnail.width,
				height: artistSummary.thumbnail.height
			};
		}
	}

	const thumb = summary?.thumbnail ?? imageFallback;
	const result = {
		image: thumb?.source ?? null,
		imageWidth: thumb?.width ?? null,
		imageHeight: thumb?.height ?? null,
		wikipediaUrl: summary?.content_urls?.desktop?.page ?? null,
		resolvedTitle: summary?.title ?? null
	};

	cache[cacheKey] = result;
	return result;
}

const seeds = JSON.parse(readFileSync(SEEDS, 'utf8'));
const out = [];
let i = 0;
let missing = 0;
for (const seed of seeds) {
	i++;
	process.stdout.write(`\r[${i}/${seeds.length}] ${seed.title.slice(0, 40).padEnd(40)}`);
	try {
		const meta = await resolve1(seed);
		if (!meta.image) missing++;
		out.push({
			id: `${slugify(seed.artist)}-${slugify(seed.title)}-${seed.year}`,
			title: seed.title,
			artist: seed.artist,
			year: seed.year,
			genre: seed.genre,
			image: meta.image,
			imageWidth: meta.imageWidth,
			imageHeight: meta.imageHeight,
			wikipediaUrl: meta.wikipediaUrl
		});
	} catch (err) {
		missing++;
		console.error(`\n  ! ${seed.title}: ${err.message}`);
		out.push({
			id: `${slugify(seed.artist)}-${slugify(seed.title)}-${seed.year}`,
			title: seed.title,
			artist: seed.artist,
			year: seed.year,
			genre: seed.genre,
			image: null,
			wikipediaUrl: null
		});
	}
	if (i % 25 === 0) writeFileSync(CACHE, JSON.stringify(cache, null, '\t'));
}

writeFileSync(CACHE, JSON.stringify(cache, null, '\t'));
writeFileSync(OUT, JSON.stringify(out, null, '\t'));
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
