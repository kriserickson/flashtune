<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		DIFFICULTY_DESC,
		DIFFICULTY_LABEL,
		GENRES,
		GENRE_LABEL,
		type Difficulty,
		type Genre
	} from '$lib/types.ts';

	const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];
	let difficulty = $state<Difficulty>('medium');
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

	const canStart = $derived(selected.size > 0);

	function start() {
		const params = new URLSearchParams({
			d: difficulty,
			g: [...selected].join(',')
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
			<span class="dim">10 songs per round</span>
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
