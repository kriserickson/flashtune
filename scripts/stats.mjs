#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const songs = JSON.parse(readFileSync(join(__dirname, 'seeds.json'), 'utf8'));

// ── helpers ──────────────────────────────────────────────────────────────────

function bar(n, max, width = 20) {
	const filled = Math.round((n / max) * width);
	return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function table(title, rows, colHeaders) {
	const colWidths = colHeaders.map((h, i) =>
		Math.max(h.length, ...rows.map((r) => String(r[i]).length))
	);
	const sep = colWidths.map((w) => '─'.repeat(w + 2)).join('┼');
	const fmt = (row) =>
		row.map((cell, i) => String(cell).padEnd(colWidths[i])).join(' │ ');

	console.log(`\n${title}`);
	console.log('─'.repeat(sep.length));
	console.log(fmt(colHeaders));
	console.log(sep);
	for (const row of rows) console.log(fmt(row));
	console.log('─'.repeat(sep.length));
	console.log();
}

// ── by era ───────────────────────────────────────────────────────────────────

const pre1940 = songs.filter((s) => s.year < 1940);

const decadeCounts = {};
for (const s of songs) {
	if (s.year < 1940) continue;
	const decade = Math.floor(s.year / 10) * 10;
	decadeCounts[decade] = (decadeCounts[decade] ?? 0) + 1;
}

const maxEra = Math.max(pre1940.length, ...Object.values(decadeCounts));

const eraRows = [
	['pre-1940', pre1940.length, bar(pre1940.length, maxEra)],
	...Object.keys(decadeCounts)
		.sort((a, b) => Number(a) - Number(b))
		.map((d) => [`${d}s`, decadeCounts[d], bar(decadeCounts[d], maxEra)]),
];

table('Songs by era', eraRows, ['Era', 'Count', 'Distribution']);

// ── by genre ─────────────────────────────────────────────────────────────────

const genreCounts = {};
for (const s of songs) {
	genreCounts[s.genre] = (genreCounts[s.genre] ?? 0) + 1;
}

const maxGenre = Math.max(...Object.values(genreCounts));

const genreRows = Object.entries(genreCounts)
	.sort((a, b) => b[1] - a[1])
	.map(([genre, count]) => [genre, count, bar(count, maxGenre)]);

table('Songs by genre', genreRows, ['Genre', 'Count', 'Distribution']);

console.log(`Total: ${songs.length} songs`);
