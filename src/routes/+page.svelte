<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		DIFFICULTY_DESC,
		DIFFICULTY_LABEL,
		formatTimeRange,
		GENRES,
		GENRE_LABEL,
		MIN_TIME_SPAN_COUNT,
		TIME_SPAN_LABEL,
		TIME_SPAN_SHORT_LABEL,
		TIME_SPANS,
		getTimeSpansInRange,
		type Difficulty,
		type Genre,
		type TimeSpan,
		type YearsBySpanAndGenre
	} from '$lib/types';

	let { data }: { data: { yearsBySpanAndGenre: YearsBySpanAndGenre } } = $props();

	const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];
	const MIN_TIME_SPAN_DISTANCE = MIN_TIME_SPAN_COUNT - 1;
	let difficulty = $state<Difficulty>('medium');
	let rangeStartIdx = $state(0);
	let rangeEndIdx = $state(TIME_SPANS.length - 1);
	let selected = $state<Set<Genre>>(new Set(GENRES));

	function toggle(g: Genre) {
		if (selected.has(g)) selected.delete(g);
		else selected.add(g);
		selected = new Set(selected);
	}

	function selectAll() {
		selected = new Set(GENRES);
	}
	function clearAll() {
		selected = new Set();
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
	const availableCount = $derived(
		(() => {
			const years = new Set<number>();
			for (const span of selectedSpans) {
				for (const genre of selected) {
					for (const year of data.yearsBySpanAndGenre[span][genre]) years.add(year);
				}
			}
			return years.size;
		})()
	);
	const placementCount = $derived(Math.max(Math.min(availableCount - 1, 10), 0));
	const canStart = $derived(selected.size > 0 && availableCount >= 2);

	function start() {
		const params = new URLSearchParams({
			d: difficulty,
			g: [...selected].join(','),
			ts: startSpan,
			te: endSpan
		});
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
				<p class="muted">
					Choose what to play with. <button type="button" class="link" onclick={selectAll}
						>All</button
					>
					·
					<button type="button" class="link" onclick={clearAll}>None</button>
				</p>
			</div>
			<div class="chips">
				{#each GENRES as g (g)}
					<button
						type="button"
						class="chip"
						aria-pressed={selected.has(g)}
						onclick={() => toggle(g)}
					>
						{GENRE_LABEL[g]}
					</button>
				{/each}
			</div>
		</div>

		<div class="panel-row panel-row--cta">
			<button type="button" class="btn btn--primary start" disabled={!canStart} onclick={start}>
				Start Round →
			</button>
			{#if selected.size === 0}
				<span class="dim">Choose at least one genre</span>
			{:else if availableCount < 2}
				<span class="dim">Need at least 2 songs for this combination</span>
			{:else if placementCount === 10}
				<span class="dim">10 placements this round</span>
			{:else}
				<span class="dim">{placementCount} placements with these filters</span>
			{/if}
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

	.link {
		background: none;
		border: 0;
		padding: 0;
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
		font: inherit;
		cursor: pointer;
	}

	.panel-row--cta {
		display: flex;
		align-items: center;
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

	.start {
		font-size: 16px;
		padding: 12px 22px;
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
