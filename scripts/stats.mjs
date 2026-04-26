#!/usr/bin/env node
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const DEFAULT_BAR_WIDTH = 20;
const __dirname = dirname(fileURLToPath(import.meta.url));
const songs = JSON.parse(readFileSync(join(__dirname, "seeds.json"), "utf8"));

// ── helpers ──────────────────────────────────────────────────────────────────

const bar = (value, max, width = DEFAULT_BAR_WIDTH) => {
  const filled = Math.round((value / max) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
};

const table = (title, rows, colHeaders) => {
  const colWidths = colHeaders.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index]).length)),
  );
  const sep = colWidths.map((width) => "─".repeat(width + 2)).join("┼");
  const fmt = (row) => row.map((cell, index) => String(cell).padEnd(colWidths[index])).join(" │ ");

  console.log(`\n${title}`);
  console.log("─".repeat(sep.length));
  console.log(fmt(colHeaders));
  console.log(sep);
  for (const row of rows) {
    console.log(fmt(row));
  }
  console.log("─".repeat(sep.length));
  console.log();
};

// ── by era ───────────────────────────────────────────────────────────────────

const pre1940 = songs.filter((song) => song.year < 1940);

const decadeCounts = {};
for (const song of songs) {
  if (song.year >= 1940) {
    const decade = Math.floor(song.year / 10) * 10;
    decadeCounts[decade] = (decadeCounts[decade] ?? 0) + 1;
  }
}

const maxEra = Math.max(pre1940.length, ...Object.values(decadeCounts));

const eraRows = [
  ["pre-1940", pre1940.length, bar(pre1940.length, maxEra)],
  ...Object.keys(decadeCounts)
    .sort((left, right) => Number(left) - Number(right))
    .map((decade) => [`${decade}s`, decadeCounts[decade], bar(decadeCounts[decade], maxEra)]),
];

table("Songs by era", eraRows, ["Era", "Count", "Distribution"]);

// ── by genre ─────────────────────────────────────────────────────────────────

const genreCounts = {};
for (const song of songs) {
  genreCounts[song.genre] = (genreCounts[song.genre] ?? 0) + 1;
}

const maxGenre = Math.max(...Object.values(genreCounts));

const genreRows = Object.entries(genreCounts)
  .sort((left, right) => right[1] - left[1])
  .map(([genre, count]) => [genre, count, bar(count, maxGenre)]);

table("Songs by genre", genreRows, ["Genre", "Count", "Distribution"]);

console.log(`Total: ${songs.length} songs`);
