<script module lang="ts">
	function verdict(score: number, total: number): string {
		const ratio = score / total;
		if (ratio === 1) return 'Perfect ear.';
		if (ratio >= 0.8) return 'Sharp.';
		if (ratio >= 0.6) return 'Solid.';
		if (ratio >= 0.4) return 'Getting there.';
		if (ratio >= 0.2) return 'A start.';
		return 'Tough round.';
	}
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { GENRE_LABEL, type Placement, type Song } from '$lib/types.ts';
	import type { PageProps } from './$types.ts';

	let { data }: PageProps = $props();

	let placed = $state<Song[]>([]);
	let queueIdx = $state(1);
	let placements = $state<Placement[]>([]);
	let phase = $state<'placing' | 'reveal' | 'done'>('placing');
	let dragging = $state(false);
	let hoverGap = $state<number | null>(null);
	let pendingGap = $state<number | null>(null);
	let lastPlacement = $state<Placement | null>(null);
	let dragOffset = $state({ x: 0, y: 0 });

	const active: Song | null = $derived(
		queueIdx < data.round.songs.length ? data.round.songs[queueIdx] : null
	);
	const score = $derived(placements.filter((p) => p.correct).length);
	const total = $derived(data.round.songs.length - 1);
	const playedCount = $derived(Math.min(placements.length + 1, total));
	const placementBySongId = $derived(
		new Map(placements.map((p) => [p.song.id, p]))
	);
	const genreSummary = $derived(
		data.round.genres.length === 7
			? 'All genres'
			: data.round.genres.length > 3
				? `${data.round.genres.length} genres`
				: data.round.genres.map((g) => GENRE_LABEL[g]).join(', ')
	);

	function commitPlacement(index: number) {
		if (!active || phase !== 'placing') return;

		// Score based on user's chosen index, but always insert at the correct position
		// so the timeline stays chronological after the reveal.
		const correct = isPositionCorrect(placed, index, active.year);
		const correctIndex = computeCorrectIndex(placed, active.year);

		const next = placed.slice();
		next.splice(correctIndex, 0, active);

		const placement: Placement = { song: active, guessedIndex: index, correct };

		placed = next;
		placements = [...placements, placement];
		lastPlacement = placement;
		phase = 'reveal';
		hoverGap = null;
		pendingGap = null;
		dragging = false;

		setTimeout(() => {
			queueIdx += 1;
			if (queueIdx >= data.round.songs.length) phase = 'done';
			else phase = 'placing';
			lastPlacement = null;
		}, 1600);
	}

	function computeCorrectIndex(arr: Song[], year: number): number {
		let i = 0;
		while (i < arr.length && arr[i].year < year) i++;
		return i;
	}

	function isPositionCorrect(arr: Song[], chosen: number, year: number): boolean {
		const before = arr[chosen - 1];
		const after = arr[chosen];
		const okBefore = !before || before.year <= year;
		const okAfter = !after || year <= after.year;
		return okBefore && okAfter;
	}

	function gapIndexUnderPoint(x: number, y: number): number | null {
		const els = document.elementsFromPoint(x, y);
		for (const el of els) {
			const gap = (el as HTMLElement).closest?.('.gap') as HTMLElement | null;
			if (gap && gap.dataset.gapIndex) {
				return Number(gap.dataset.gapIndex);
			}
		}
		return null;
	}

	function onActivePointerDown(e: PointerEvent) {
		if (!active || phase !== 'placing') return;
		// Only primary button (or touch/pen)
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		e.preventDefault();
		dragging = true;
		pendingGap = null;
		dragOffset = { x: 0, y: 0 };
		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
	}

	function onActivePointerMove(e: PointerEvent) {
		if (!dragging) return;
		dragOffset = { x: e.clientX - (e as PointerEvent).clientX + 0, y: 0 };
		// translate offset relative to original card position is computed via CSS variables
		const card = e.currentTarget as HTMLElement;
		const rect = card.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		dragOffset = { x: e.clientX - cx, y: e.clientY - cy };
		hoverGap = gapIndexUnderPoint(e.clientX, e.clientY);
	}

	function onActivePointerUp(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		const target = e.currentTarget as HTMLElement;
		try {
			target.releasePointerCapture(e.pointerId);
		} catch {}
		const idx = gapIndexUnderPoint(e.clientX, e.clientY);
		dragOffset = { x: 0, y: 0 };
		if (idx !== null) {
			pendingGap = idx;
		}
		hoverGap = null;
	}

	function onActivePointerCancel() {
		dragging = false;
		hoverGap = null;
		dragOffset = { x: 0, y: 0 };
	}

	function onGapClick(i: number) {
		if (!active || phase !== 'placing') return;
		// On mobile (and as a fallback), tapping a gap commits immediately.
		// On desktop after a drag, the user clicks the pendingGap confirm button.
		commitPlacement(i);
	}

	function newRound() {
		// Trigger a fresh server load with same params
		const url = new URL(window.location.href);
		url.searchParams.set('_', String(Date.now()));
		goto(url.pathname + url.search, { invalidateAll: true });
		// reset local state on the new mount via key-based remount below
	}

	function backToSettings() {
		goto('/');
	}

	// Reset state when round.songs changes (after newRound triggers reload)
	$effect(() => {
		const songs = data.round.songs;
		placed = [songs[0]];
		queueIdx = 1;
		placements = [];
		phase = 'placing';
		lastPlacement = null;
	});
</script>

<svelte:head>
	<title>Flashtune — playing</title>
</svelte:head>

<main class="play">
	<header class="topbar">
		<button type="button" class="btn btn--ghost icon-btn" onclick={backToSettings} aria-label="Back">
			←
		</button>
		<div class="topbar__meta">
			<div class="meta-line dim">
				<span class="cap">{data.round.difficulty}</span>
				<span class="meta-sep">·</span>
				<span class="meta-genres">{genreSummary}</span>
			</div>
			<div class="meta-progress">
				<span class="badge"
					>{score}<span class="badge__sep">/</span><span class="dim">{total}</span></span
				>
				<span class="dim">round {playedCount} of {total}</span>
			</div>
		</div>
	</header>

	<section class="timeline-wrap" aria-label="Timeline">
		<ol class="timeline" class:dragging>
			<!-- gap, card, gap, card, ..., gap -->
			{#each Array.from({ length: placed.length + 1 }) as _slot, i (i)}
				<li class="row row--gap">
					<button
						type="button"
						class="gap"
						class:gap--hover={hoverGap === i}
						class:gap--active={phase === 'placing'}
						class:gap--pending={pendingGap === i}
						data-gap-index={i}
						aria-label={pendingGap === i ? 'Click to place here' : 'Place here (slot ' + (i + 1) + ')'}
						onclick={() => onGapClick(i)}
						disabled={phase !== 'placing'}
					>
						<span class="gap__rule"></span>
						{#if phase === 'placing'}
							{#if pendingGap === i}
								<span class="gap__label gap__label--confirm">Click to place here</span>
							{:else}
								<span class="gap__label gap__label--persistent">
									<span class="gap__verb gap__verb--mouse">Click</span><span
										class="gap__verb gap__verb--touch">Tap</span
									> to place here
								</span>
							{/if}
						{:else}
							<span class="gap__pin"></span>
						{/if}
					</button>
				</li>
				{#if i < placed.length}
					{@const song = placed[i]}
					{@const isLast =
						lastPlacement && lastPlacement.song.id === song.id && phase === 'reveal'}
					{@const placement = placementBySongId.get(song.id)}
					<li class="row row--card">
						<article
							class="placed"
							class:placed--reveal-ok={isLast && lastPlacement?.correct}
							class:placed--reveal-bad={isLast && lastPlacement && !lastPlacement.correct}
						>
							<div class="placed__year">
								<span>{song.year}</span>
								{#if placement}
									<span
										class="placed__mark"
										class:placed__mark--ok={placement.correct}
										class:placed__mark--bad={!placement.correct}
										aria-label={placement.correct ? 'Correct' : 'Wrong'}
									>
										{placement.correct ? '✓' : '✗'}
									</span>
								{/if}
							</div>
							<div class="placed__img" style="--bg-img: url({song.image})"></div>
							<div class="placed__meta">
								<div class="placed__title" title={song.title}>{song.title}</div>
								<div class="placed__artist" title={song.artist}>{song.artist}</div>
							</div>
						</article>
					</li>
				{/if}
			{/each}
		</ol>
	</section>

	{#if phase === 'done'}
		<section class="results card">
			<div class="results__head">
				<div class="results__score">
					<span class="results__num">{score}</span>
					<span class="dim">/ {total}</span>
				</div>
				<h2>{verdict(score, total)}</h2>
				<p class="muted">Here's where each song belonged:</p>
			</div>
			<ol class="recap">
				{#each placements as p (p.song.id)}
					<li class="recap__row" class:recap__row--ok={p.correct} class:recap__row--bad={!p.correct}>
						<span class="recap__year">{p.song.year}</span>
						<span class="recap__title">{p.song.title}</span>
						<span class="recap__artist dim">{p.song.artist}</span>
						<span class="recap__icon">{p.correct ? '✓' : '✗'}</span>
					</li>
				{/each}
			</ol>
			<div class="results__actions">
				<button class="btn btn--primary" onclick={newRound}>Play another</button>
				<button class="btn btn--ghost" onclick={backToSettings}>Change settings</button>
			</div>
		</section>
	{:else if active}
		<section class="active-wrap">
			{#if phase === 'reveal' && lastPlacement}
				<div class="reveal" class:reveal--ok={lastPlacement.correct} class:reveal--bad={!lastPlacement.correct}>
					{lastPlacement.correct ? 'Right where it belongs.' : 'Not quite — see the year above.'}
				</div>
			{:else}
				<div class="prompt">
					<span class="dim">Place this song into the timeline</span>
				</div>
			{/if}
			<article
				class="active"
				class:active--reveal={phase === 'reveal'}
				draggable={phase === 'placing'}
				ondragstart={onDragStart}
				ondragend={onDragEnd}
			>
				<div class="active__img" style="--bg-img: url({active.image})"></div>
				<div class="active__body">
					<div class="active__title">{active.title}</div>
					<div class="active__artist">{active.artist}</div>
					<div class="active__year">
						{phase === 'reveal' ? active.year : '????'}
					</div>
				</div>
			</article>
		</section>
	{/if}
</main>

<style>
	.play {
		max-width: 1100px;
		margin: 0 auto;
		padding: 16px 18px 200px;
		min-height: 100vh;
	}

	.topbar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 4px 0 16px;
		border-bottom: 1px solid var(--border);
		margin-bottom: 18px;
	}
	.icon-btn {
		padding: 8px 12px;
		font-size: 18px;
		line-height: 1;
	}
	.topbar__meta {
		flex: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.meta-line {
		text-transform: capitalize;
		font-size: 13px;
		display: flex;
		gap: 6px;
	}
	.meta-progress {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 13px;
	}
	.badge {
		background: var(--bg-elev);
		border: 1px solid var(--border-strong);
		padding: 4px 10px;
		border-radius: 999px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.badge__sep {
		color: var(--fg-dim);
		margin: 0 1px;
	}

	.timeline-wrap {
		padding: 8px 0 24px;
		max-width: 560px;
		margin: 0 auto;
	}
	.timeline {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		position: relative;
	}
	.row {
		display: flex;
	}

	.gap {
		position: relative;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
		min-height: 16px;
		padding: 4px 0;
		background: transparent;
		border: 0;
		cursor: pointer;
		transition: min-height 180ms ease, padding 180ms ease;
	}
	.gap[disabled] {
		cursor: default;
		min-height: 8px;
	}
	.gap__rule {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: 2px;
		background: var(--border-strong);
		border-radius: 2px;
		opacity: 0.6;
		transition: background 160ms ease, opacity 160ms ease, height 160ms ease;
	}
	.gap__pin {
		display: none;
	}
	.gap__label {
		position: relative;
		z-index: 1;
		display: inline-flex;
		gap: 4px;
		align-items: center;
		white-space: nowrap;
		font-size: 12px;
		color: var(--fg-muted);
		background: var(--bg);
		padding: 2px 10px;
		border-radius: 999px;
		border: 1px dashed var(--border-strong);
		transition: all 160ms ease;
	}
	.gap--active:not([disabled]) .gap__rule {
		background: var(--accent);
		opacity: 0.35;
	}
	.gap--active:not([disabled]) .gap__label {
		color: var(--accent);
		border-color: var(--accent);
		border-style: dashed;
	}
	.gap--hover:not([disabled]) {
		min-height: 56px;
	}
	.gap--hover:not([disabled]) .gap__rule {
		background: var(--accent);
		opacity: 1;
		height: 4px;
	}
	.gap--hover:not([disabled]) .gap__label {
		background: var(--accent);
		color: var(--bg);
		border-style: solid;
		border-color: var(--accent);
		font-weight: 600;
		box-shadow: 0 0 0 6px var(--ring);
		transform: scale(1.05);
	}

	.gap__verb--touch {
		display: none;
	}
	@media (hover: none) and (pointer: coarse) {
		.gap__verb--mouse {
			display: none;
		}
		.gap__verb--touch {
			display: inline;
		}
	}

	.placed {
		position: relative;
		flex: 1;
		min-width: 0;
		display: grid;
		grid-template-columns: 64px 56px minmax(0, 1fr);
		align-items: center;
		gap: 14px;
		padding: 10px 14px;
		border-radius: var(--radius-sm);
		background: var(--bg-elev);
		border: 1px solid var(--border);
		box-sizing: border-box;
		transition: background 160ms ease, transform 200ms ease, box-shadow 200ms ease;
	}
	.placed--reveal-ok {
		background: rgba(102, 217, 154, 0.14);
		box-shadow: 0 0 0 1px rgba(102, 217, 154, 0.5);
		transform: translateX(2px);
	}
	.placed--reveal-bad {
		background: rgba(255, 100, 112, 0.12);
		box-shadow: 0 0 0 1px rgba(255, 100, 112, 0.5);
		animation: shake 320ms ease;
	}
	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-4px); }
		75% { transform: translateX(4px); }
	}

	.placed__year {
		font-family: var(--font-display);
		font-size: 22px;
		font-weight: 700;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.placed__img {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--bg-img) center/cover, var(--bg-elev-2);
		border: 2px solid var(--border-strong);
	}
	.placed__meta {
		min-width: 0;
	}
	.placed__title {
		font-size: 14px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.placed__artist {
		font-size: 12.5px;
		color: var(--fg-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.active-wrap {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 16px 18px 20px;
		background:
			linear-gradient(180deg, rgba(11, 13, 18, 0) 0%, rgba(11, 13, 18, 0.92) 30%, var(--bg) 100%);
		backdrop-filter: blur(6px);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		z-index: 10;
	}

	.prompt,
	.reveal {
		font-size: 13px;
		text-align: center;
	}
	.reveal {
		font-weight: 600;
	}
	.reveal--ok {
		color: var(--ok);
	}
	.reveal--bad {
		color: var(--bad);
	}

	.active {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 16px 12px 12px;
		background: var(--bg-elev);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		box-shadow: var(--shadow-lg);
		max-width: 460px;
		width: 100%;
		cursor: grab;
		user-select: none;
		transition: transform 200ms ease, box-shadow 200ms ease;
	}
	.active:active {
		cursor: grabbing;
		transform: scale(0.98);
	}
	.active--reveal {
		cursor: default;
	}

	.active__img {
		width: 76px;
		height: 76px;
		border-radius: var(--radius-sm);
		background: var(--bg-img) center/cover, var(--bg-elev-2);
		flex: 0 0 auto;
		pointer-events: none;
	}
	.active__body {
		flex: 1;
		min-width: 0;
		display: grid;
		gap: 2px;
	}
	.active__title {
		font-weight: 600;
		font-size: 15px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.active__artist {
		color: var(--fg-muted);
		font-size: 13px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.active__year {
		margin-top: 4px;
		font-family: var(--font-display);
		font-size: 22px;
		font-weight: 700;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
	}

	.results {
		max-width: 540px;
		margin: 32px auto 0;
		padding: 28px 24px;
		display: grid;
		gap: 20px;
	}
	.results__head {
		text-align: center;
		display: grid;
		gap: 6px;
	}
	.results__score {
		font-family: var(--font-display);
		font-size: 64px;
		font-weight: 700;
		line-height: 1;
		color: var(--accent);
	}
	.results__num {
		font-variant-numeric: tabular-nums;
	}
	.results h2 {
		font-size: 22px;
	}

	.recap {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 6px;
	}
	.recap__row {
		display: grid;
		grid-template-columns: 60px 1fr auto 24px;
		gap: 10px;
		align-items: baseline;
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		background: var(--bg-elev-2);
		font-size: 13px;
	}
	.recap__row--ok {
		border-left: 3px solid var(--ok);
	}
	.recap__row--bad {
		border-left: 3px solid var(--bad);
	}
	.recap__year {
		font-family: var(--font-display);
		font-weight: 600;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.recap__title {
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.recap__artist {
		font-size: 12px;
	}
	.recap__icon {
		text-align: center;
		font-weight: 700;
	}
	.recap__row--ok .recap__icon {
		color: var(--ok);
	}
	.recap__row--bad .recap__icon {
		color: var(--bad);
	}

	.results__actions {
		display: flex;
		justify-content: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	@media (max-width: 540px) {
		.placed {
			grid-template-columns: 52px 48px minmax(0, 1fr);
			gap: 20px;
			padding: 10px 12px;
		}
		.placed__img {
			width: 48px;
			height: 48px;
		}
		.placed__year {
			font-size: 18px;
		}
	}
</style>
