<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		DEFAULT_PLACEMENT_COUNT,
		DIFFICULTY_DESC,
		DIFFICULTY_LABEL,
		formatTimeRange,
		GENRES,
		GENRE_LABEL,
		MIN_TIME_SPAN_COUNT,
		PLACEMENT_COUNTS,
		TIME_SPAN_LABEL,
		TIME_SPAN_SHORT_LABEL,
		TIME_SPANS,
		getTimeSpansInRange,
		type Difficulty,
		type Genre,
		type PlacementCount,
		type TimeSpan,
		type YearsBySpanAndGenre
	} from '$lib/types';

	let { data }: { data: { yearsBySpanAndGenre: YearsBySpanAndGenre } } = $props();

	const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];
	const MIN_TIME_SPAN_DISTANCE = MIN_TIME_SPAN_COUNT - 1;
	let difficulty = $state<Difficulty>('medium');
	let rangeStartIdx = $state(0);
	let rangeEndIdx = $state(TIME_SPANS.length - 1);
	let allGenres = $state(true);
	let selected = $state<Set<Genre>>(new Set());
	let placementCount = $state<PlacementCount>(DEFAULT_PLACEMENT_COUNT);

	function activateAllGenres() {
		allGenres = true;
		selected = new Set();
	}

	function toggle(g: Genre) {
		if (allGenres) {
			allGenres = false;
			selected = new Set([g]);
			return;
		}

		const next = new Set(selected);
		if (next.has(g)) {
			if (next.size === 1) return;
			next.delete(g);
		} else {
			next.add(g);
			if (next.size === GENRES.length) {
				activateAllGenres();
				return;
			}
		}

		selected = next;
	}

	function selectAll() {
		if (allGenres) return;
		activateAllGenres();
	}

	function selectPlacementCount(next: PlacementCount) {
		if (availableCount < next + 1) return;
		placementCount = next;
	}

	function setRangeStart(event: Event) {
		const next = Number((event.currentTarget as HTMLInputElement).value);
		rangeStartIdx = Math.min(next, rangeEndIdx - MIN_TIME_SPAN_DISTANCE);
	}

	function setRangeEnd(event: Event) {
		const next = Number((event.currentTarget as HTMLInputElement).value);
		rangeEndIdx = Math.max(next, rangeStartIdx + MIN_TIME_SPAN_DISTANCE);
	}

	function moveNearestHandle(index: number) {
		const distanceToStart = Math.abs(index - rangeStartIdx);
		const distanceToEnd = Math.abs(index - rangeEndIdx);
		if (distanceToStart <= distanceToEnd) {
			rangeStartIdx = Math.min(index, rangeEndIdx - MIN_TIME_SPAN_DISTANCE);
		} else {
			rangeEndIdx = Math.max(index, rangeStartIdx + MIN_TIME_SPAN_DISTANCE);
		}
	}

	const startSpan = $derived(TIME_SPANS[rangeStartIdx] as TimeSpan);
	const endSpan = $derived(TIME_SPANS[rangeEndIdx] as TimeSpan);
	const selectedSpans = $derived(getTimeSpansInRange(startSpan, endSpan));
	const rangeLabel = $derived(formatTimeRange({ start: startSpan, end: endSpan }));
	const rangeStartRatio = $derived(rangeStartIdx / (TIME_SPANS.length - 1));
	const rangeEndRatio = $derived(rangeEndIdx / (TIME_SPANS.length - 1));
	const effectiveGenres = $derived(allGenres ? GENRES : GENRES.filter((genre) => selected.has(genre)));
	const availableCount = $derived(
		(() => {
			const years = new Set<number>();
			for (const span of selectedSpans) {
				for (const genre of effectiveGenres) {
					for (const year of data.yearsBySpanAndGenre[span][genre]) years.add(year);
				}
			}
			return years.size;
		})()
	);
	const availablePlacementCounts = $derived(
		PLACEMENT_COUNTS.filter((count) => availableCount >= count + 1)
	);
	const longestRound = $derived(availablePlacementCounts.at(-1) ?? null);
	const canStart = $derived(availableCount >= placementCount + 1);

	$effect(() => {
		if (availablePlacementCounts.includes(placementCount)) return;

		const fallback = availablePlacementCounts.at(-1);
		placementCount = fallback ?? DEFAULT_PLACEMENT_COUNT;
	});

	function start() {
		const params = new URLSearchParams({
			d: difficulty,
			ts: startSpan,
			te: endSpan,
			c: String(placementCount)
		});
		if (!allGenres) params.set('g', effectiveGenres.join(','));
		goto(`/play?${params}`);
	}
</script>

<main class="container">
	<header class="hero">
		<h1>Flashtune</h1>
		<p class="tagline">
			A musical timeline. From <em>Henry Purcell</em> to <em>Taylor Swift</em> — drag each song into
			the right place in history.
		</p>
	</header>

	<section class="card panel">
		<div class="panel-row">
			<div class="panel-row__head">
				<h2>Difficulty</h2>
				<p class="muted">How close together can songs appear?</p>
			</div>
			<div class="diff-grid" role="radiogroup" aria-label="Difficulty">
				{#each DIFFS as d (d)}
					<button
						type="button"
						class="diff-card"
						role="radio"
						aria-checked={difficulty === d}
						onclick={() => (difficulty = d)}
					>
						<span class="diff-card__label">{DIFFICULTY_LABEL[d]}</span>
						<span class="diff-card__desc">{DIFFICULTY_DESC[d]}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="panel-row">
			<div class="panel-row__head">
				<h2>Time range</h2>
				<p class="muted">{rangeLabel}</p>
			</div>
			<div class="range-picker" style={`--range-start:${rangeStartRatio}; --range-end:${rangeEndRatio};`}>
				<div class="range-picker__rail">
					<span class="range-picker__track"></span>
					<span class="range-picker__fill"></span>
					<input
						type="range"
						class="range-picker__input"
						min="0"
						max={TIME_SPANS.length - 1}
						step="1"
						value={rangeStartIdx}
						oninput={setRangeStart}
						aria-label="Starting time span"
					/>
					<input
						type="range"
						class="range-picker__input"
						min="0"
						max={TIME_SPANS.length - 1}
						step="1"
						value={rangeEndIdx}
						oninput={setRangeEnd}
						aria-label="Ending time span"
					/>
				</div>
				<div class="range-picker__labels">
					{#each TIME_SPANS as span, index (span)}
						<button
							type="button"
							class="range-picker__label"
							class:range-picker__label--active={index >= rangeStartIdx && index <= rangeEndIdx}
							style={`--stop:${index / (TIME_SPANS.length - 1)}`}
							onclick={() => moveNearestHandle(index)}
						>
							<span class="range-picker__tick"></span>
							<span class="range-picker__text">{TIME_SPAN_SHORT_LABEL[span]}</span>
						</button>
					{/each}
				</div>
				<div class="range-picker__legend muted">
					<span>{TIME_SPAN_LABEL[startSpan]}</span>
					<span>{TIME_SPAN_LABEL[endSpan]}</span>
				</div>
			</div>
		</div>

		<div class="panel-row">
			<div class="panel-row__head">
				<h2>Genres</h2>
				<p class="muted">Choose what to play with.</p>
			</div>
			<div class="genre-picker">
				<button type="button" class="chip chip--all" aria-pressed={allGenres} onclick={selectAll}>
					All
				</button>
				<span class="genre-picker__divider" aria-hidden="true"></span>
				<div class="chips genre-picker__chips">
					{#each GENRES as g (g)}
						<button
							type="button"
							class="chip"
							aria-pressed={!allGenres && selected.has(g)}
							onclick={() => toggle(g)}
						>
							{GENRE_LABEL[g]}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="panel-row panel-row--cta">
			<button type="button" class="btn btn--primary start" disabled={!canStart} onclick={start}>
				Start Round →
			</button>
			<div class="round-length">
				<div class="round-length__head">
					<div>
						<p class="round-length__eyebrow">Round length</p>
						<h3>{placementCount} placements</h3>
					</div>
					{#if longestRound}
						<span class="dim">Up to {longestRound} available with these filters</span>
					{:else}
						<span class="dim">Need 11 songs for the shortest round</span>
					{/if}
				</div>
				<div class="round-length__options" role="radiogroup" aria-label="Placements per round">
					{#each PLACEMENT_COUNTS as count (count)}
						{@const requiredSongs = count + 1}
						<button
							type="button"
							class="round-length__option"
							role="radio"
							aria-checked={placementCount === count}
							disabled={availableCount < requiredSongs}
							onclick={() => selectPlacementCount(count)}
						>
							<span class="round-length__value">{count}</span>
							<span class="round-length__suffix">placements</span>
							<span class="round-length__meta">{requiredSongs} songs total</span>
						</button>
					{/each}
				</div>
				{#if !canStart}
					<p class="round-length__hint dim">
						Need at least {placementCount + 1} songs for this round length.
					</p>
				{/if}
			</div>
		</div>
	</section>

	<footer class="foot">
		<p class="dim">
			Drag each new song into the timeline. You score one point for every correct placement.
		</p>
	</footer>
</main>

<style>
	.hero {
		text-align: center;
		padding: 56px 0 32px;
	}
	.hero h1 {
		font-size: clamp(48px, 9vw, 96px);
		line-height: 1;
		letter-spacing: -0.03em;
		background: linear-gradient(180deg, var(--fg) 0%, var(--fg-muted) 100%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.tagline {
		max-width: 560px;
		margin: 16px auto 0;
		color: var(--fg-muted);
		font-size: 17px;
	}
	.tagline em {
		font-family: var(--font-display);
		font-style: italic;
		color: var(--accent);
		font-weight: 500;
	}

	.panel {
		padding: 24px;
		display: grid;
		gap: 28px;
	}
	.panel-row__head h2 {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 4px;
	}
	.panel-row__head p {
		margin: 0;
		font-size: 14px;
	}
	.panel-row__head {
		margin-bottom: 14px;
	}

	.diff-grid {
		display: grid;
		gap: 10px;
		grid-template-columns: repeat(3, 1fr);
	}
	@media (max-width: 540px) {
		.diff-grid {
			grid-template-columns: 1fr;
		}
	}

	.range-picker {
		--range-rail-height: 32px;
		--range-thumb-size: 20px;
		--range-thumb-offset: calc(var(--range-thumb-size) / 2);
		--range-usable-width: calc(100% - var(--range-thumb-size));
		position: relative;
		display: grid;
		gap: 14px;
		padding-top: 8px;
	}
	.range-picker__rail {
		position: relative;
		height: var(--range-rail-height);
		overflow: visible;
	}
	.range-picker__track,
	.range-picker__fill {
		position: absolute;
		left: var(--range-thumb-offset);
		right: var(--range-thumb-offset);
		top: 50%;
		height: 8px;
		border-radius: 999px;
		transform: translateY(-50%);
	}
	.range-picker__track {
		z-index: 0;
		background: var(--bg-elev-2);
		border: 1px solid var(--border);
	}
	.range-picker__fill {
		z-index: 1;
		left: calc(var(--range-thumb-offset) + var(--range-usable-width) * var(--range-start));
		right: calc(var(--range-thumb-offset) + var(--range-usable-width) * (1 - var(--range-end)));
		background: linear-gradient(90deg, var(--accent-warm) 0%, var(--accent) 100%);
		box-shadow: 0 0 0 4px rgba(255, 184, 77, 0.16);
	}
	.range-picker__input {
		position: absolute;
		top: 0;
		left: var(--range-thumb-offset);
		width: var(--range-usable-width);
		height: var(--range-rail-height);
		margin: 0;
		z-index: 2;
		background: none;
		pointer-events: none;
		appearance: none;
		-webkit-appearance: none;
	}
	.range-picker__input::-webkit-slider-runnable-track {
		height: var(--range-rail-height);
		background: transparent;
	}
	.range-picker__input::-moz-range-track {
		height: var(--range-rail-height);
		background: transparent;
	}
	.range-picker__input::-webkit-slider-thumb {
		pointer-events: auto;
		width: var(--range-thumb-size);
		height: var(--range-thumb-size);
		border-radius: 50%;
		border: 2px solid var(--accent);
		background: var(--bg);
		box-shadow: 0 0 0 4px var(--ring);
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		margin-top: calc((var(--range-rail-height) - var(--range-thumb-size)) / 2);
		transform: translateY(1px);
	}
	.range-picker__input::-moz-range-thumb {
		pointer-events: auto;
		width: var(--range-thumb-size);
		height: var(--range-thumb-size);
		border-radius: 50%;
		border: 2px solid var(--accent);
		background: var(--bg);
		box-shadow: 0 0 0 4px var(--ring);
		cursor: pointer;
		transform: translateY(1px);
	}
	.range-picker__labels {
		position: relative;
		height: 54px;
		padding: 0;
		overflow: visible;
	}
	.range-picker__label {
		position: absolute;
		left: calc(var(--range-thumb-offset) + var(--range-usable-width) * var(--stop));
		top: 0;
		transform: translateX(-50%);
		display: grid;
		gap: 6px;
		justify-items: center;
		padding: 0;
		width: max-content;
		border: 0;
		background: none;
		color: var(--fg-dim);
		font-size: 11px;
		font-weight: 600;
	}
	.range-picker__label--active {
		color: var(--fg);
	}
	.range-picker__tick {
		width: 2px;
		height: 10px;
		border-radius: 999px;
		background: var(--border-strong);
	}
	.range-picker__label--active .range-picker__tick {
		background: var(--accent);
	}
	.range-picker__legend {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		font-size: 12px;
		padding: 0 var(--range-thumb-offset);
	}
	@media (max-width: 640px) {
		.range-picker__text {
			font-size: 10px;
		}
		.range-picker__legend {
			flex-direction: column;
			gap: 4px;
		}
	}

	.diff-card {
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px 16px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-strong);
		background: var(--bg-elev-2);
		color: var(--fg-muted);
		transition:
			background 120ms ease,
			border-color 120ms ease,
			color 120ms ease;
	}
	.diff-card:hover {
		border-color: var(--fg-dim);
		color: var(--fg);
	}
	.diff-card[aria-checked='true'] {
		border-color: var(--accent);
		background: rgba(255, 184, 77, 0.08);
		color: var(--fg);
		box-shadow: 0 0 0 3px var(--ring) inset;
	}
	.diff-card__label {
		font-weight: 600;
		font-size: 16px;
		font-family: var(--font-display);
	}
	.diff-card__desc {
		font-size: 12.5px;
		color: var(--fg-muted);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.genre-picker {
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}
	.genre-picker__divider {
		width: 1px;
		height: 28px;
		background: var(--border-strong);
		flex: 0 0 auto;
	}
	.genre-picker__chips {
		flex: 1 1 320px;
	}
	.chip--all {
		min-width: 58px;
	}

	.round-length {
		flex: 1 1 420px;
		display: grid;
		gap: 12px;
	}
	.round-length__head {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 12px;
		flex-wrap: wrap;
	}
	.round-length__head h3 {
		font-size: 24px;
	}
	.round-length__eyebrow {
		margin: 0 0 2px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.round-length__options {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 10px;
	}
	.round-length__option {
		text-align: left;
		display: grid;
		gap: 2px;
		padding: 14px 14px 12px;
		border-radius: 12px;
		border: 1px solid var(--border-strong);
		background:
			linear-gradient(180deg, rgba(255, 184, 77, 0.1) 0%, rgba(255, 127, 80, 0.03) 100%),
			var(--bg-elev-2);
		color: var(--fg-muted);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
		transition:
			transform 120ms ease,
			border-color 120ms ease,
			color 120ms ease,
			background 120ms ease,
			box-shadow 120ms ease;
	}
	.round-length__option:hover:not(:disabled) {
		transform: translateY(-1px);
		border-color: var(--fg-dim);
		color: var(--fg);
	}
	.round-length__option[aria-checked='true'] {
		border-color: var(--accent);
		color: var(--fg);
		background:
			linear-gradient(180deg, rgba(255, 184, 77, 0.2) 0%, rgba(255, 127, 80, 0.08) 100%),
			var(--bg-elev-2);
		box-shadow:
			0 0 0 3px var(--ring),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}
	.round-length__option:disabled {
		opacity: 0.42;
		cursor: not-allowed;
		background: var(--bg-elev);
	}
	.round-length__value {
		font-family: var(--font-display);
		font-size: 32px;
		line-height: 0.95;
		color: inherit;
	}
	.round-length__suffix,
	.round-length__meta {
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.round-length__meta {
		letter-spacing: 0.04em;
		text-transform: none;
		color: var(--fg-dim);
	}
	.round-length__hint {
		margin: 0;
		font-size: 13px;
	}

	.panel-row--cta {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		padding-top: 4px;
		border-top: 1px solid var(--border);
		margin-top: 4px;
	}
	@media (max-width: 480px) {
		.panel-row--cta {
			flex-direction: column;
			align-items: stretch;
		}
	}
	@media (max-width: 760px) {
		.round-length__options {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.start {
		font-size: 16px;
		padding: 12px 22px;
		align-self: center;
	}
	.start:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.foot {
		text-align: center;
		padding: 32px 0;
		font-size: 13px;
	}
</style>
