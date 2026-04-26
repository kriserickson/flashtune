<script lang="ts">
	import { computeCorrectIndex, isPositionCorrect } from '$lib/play-logic';
	import { getSuccessMessage, verdict } from '$lib/play-feedback';
	import {
		GENRE_LABEL,
		formatTimeRange,
		type Genre,
		type Placement,
		type Round,
		type Song
	} from '$lib/types';
	import { goto } from '$app/navigation';

	const ALL_GENRES_COUNT = 7;
	const GENRE_SUMMARY_THRESHOLD = 3;
	const INITIAL_POINT = 0;
	const DRAG_THRESHOLD = 6;
	const FIRST_QUEUE_INDEX = 1;
	const FIRST_SONG_INDEX = 0;
	const ROUND_LENGTH_OFFSET = 1;
	const PLAYED_COUNT_OFFSET = 1;
	const PRIMARY_MOUSE_BUTTON = 0;
	const INSERT_AT_INDEX = 0;
	const QUEUE_INDEX_INCREMENT = 1;
	const REVEAL_DELAY_MS = 1600;

	const { data }: { data: { round: Round } } = $props();

	let placed = $state<Song[]>([]);
	let queueIdx = $state(FIRST_QUEUE_INDEX);
	let placements = $state<Placement[]>([]);
	let phase = $state<'placing' | 'reveal' | 'done'>('placing');
	let dragging = $state(false);
	let hoverGap = $state<number | null>(null);
	let pendingGap = $state<number | null>(null);
	let lastPlacement = $state<Placement | null>(null);
	let dragOffset = $state({ x: 0, y: 0 });
	let previewDragging = $state(false);
	let previewOffset = $state({ x: 0, y: 0 });
	let previewDragStart = { pointerX: INITIAL_POINT, pointerY: INITIAL_POINT };
	let previewDidDrag = false;

	const active: Song | null = $derived(data.round.songs[queueIdx] ?? null);
	const score = $derived(placements.filter((p) => p.correct).length);
	const total = $derived(data.round.songs.length - ROUND_LENGTH_OFFSET);
	const playedCount = $derived(Math.min(placements.length + PLAYED_COUNT_OFFSET, total));
	const placementBySongId = $derived(
		new Map(placements.map((p) => [p.song.id, p]))
	);
	const genreSummary = $derived(getGenreSummary(data.round.genres));
	const timeRangeSummary = $derived(formatTimeRange(data.round.timeRange));
	const revealMessage = $derived(getRevealMessage(lastPlacement));
	const resultCopy = $derived(verdict(score, total));

	function getGenreSummary(genres: readonly Genre[]) {
		if (genres.length === ALL_GENRES_COUNT) {return 'All genres';}
		if (genres.length > GENRE_SUMMARY_THRESHOLD) {return `${genres.length} genres`;}
		return genres.map((genre) => GENRE_LABEL[genre]).join(', ');
	}

	function getRevealMessage(placement: Placement | null) {
		if (!placement) {return '';}
		if (placement.correct) {return getSuccessMessage(placement.song);}
		return 'Not quite — see the year above.';
	}

	const createPlacementResult = (index: number) => {
		if (!active || phase !== 'placing') {return null;}

		const correct = isPositionCorrect(placed, index, active.year);
		const correctIndex = computeCorrectIndex(placed, active.year);
		const next = placed.slice();
		next.splice(correctIndex, INSERT_AT_INDEX, active);
		const placement: Placement = { correct, guessedIndex: index, song: active };
		const nextQueueIdx = queueIdx + QUEUE_INDEX_INCREMENT;
		const hasNextSong = nextQueueIdx < data.round.songs.length;

		return { next, placement, nextQueueIdx, hasNextSong };
	};

	const resetPlacementState = () => {
		phase = 'reveal';
		hoverGap = null;
		pendingGap = null;
		dragging = false;
		previewDragging = false;
		previewOffset = { x: 0, y: 0 };
		dragOffset = { x: 0, y: 0 };
	};

	const transitionAfterReveal = (hasNextSong: boolean) => {
		if (!hasNextSong) {phase = 'done';}
		else {phase = 'placing';}
		lastPlacement = null;
	};

	const commitPlacement = (index: number) => {
		const result = createPlacementResult(index);
		if (!result) {return;}

		placed = result.next;
		placements = [...placements, result.placement];
		lastPlacement = result.placement;
		queueIdx = result.nextQueueIdx;
		resetPlacementState();

		setTimeout(() => {
			transitionAfterReveal(result.hasNextSong);
		}, REVEAL_DELAY_MS);
	};


	const gapIndexUnderPoint = (x: number, y: number): number | null => {
		const els = document.elementsFromPoint(x, y);
		for (const el of els) {
			const gap = (el as HTMLElement).closest?.('.gap') as HTMLElement | null;
			if (gap && gap.dataset.gapIndex) {
				return Number(gap.dataset.gapIndex);
			}
		}
		return null;
	};

	const onActivePointerDown = (e: PointerEvent) => {
		if (!active || phase !== 'placing') {return;}
		if (e.pointerType === 'mouse' && e.button !== PRIMARY_MOUSE_BUTTON) {return;}
		e.preventDefault();
		dragging = true;
		pendingGap = null;
		dragOffset = { x: 0, y: 0 };
		dragStart = {
			baseX: INITIAL_POINT,
			baseY: INITIAL_POINT,
			pointerX: INITIAL_POINT,
			pointerY: INITIAL_POINT
		};
		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
	};

	let dragStart = { baseX: INITIAL_POINT, baseY: INITIAL_POINT, pointerX: INITIAL_POINT, pointerY: INITIAL_POINT };
	const onActivePointerMove = (e: PointerEvent) => {
		if (!dragging) {return;}
		if (dragStart.pointerX === INITIAL_POINT && dragStart.pointerY === INITIAL_POINT) {
			const card = e.currentTarget as HTMLElement;
			const rect = card.getBoundingClientRect();
			dragStart = {
				baseX: rect.left,
				baseY: rect.top,
				pointerX: e.clientX,
				pointerY: e.clientY
			};
		}
		dragOffset = {
			x: e.clientX - dragStart.pointerX,
			y: e.clientY - dragStart.pointerY
		};
		hoverGap = gapIndexUnderPoint(e.clientX, e.clientY);
	};

	const onActivePointerUp = (e: PointerEvent) => {
		if (!dragging) {return;}
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
	};

	const onActivePointerCancel = () => {
		dragging = false;
		hoverGap = null;
		dragOffset = { x: 0, y: 0 };
	};

	const onPreviewPointerDown = (e: PointerEvent) => {
		if (!active || phase !== 'placing' || pendingGap === null) {return;}
		if (e.pointerType === 'mouse' && e.button !== PRIMARY_MOUSE_BUTTON) {return;}
		e.preventDefault();
		previewDragging = true;
		previewDidDrag = false;
		previewOffset = { x: 0, y: 0 };
		previewDragStart = { pointerX: INITIAL_POINT, pointerY: INITIAL_POINT };
		const target = e.currentTarget as HTMLElement;
		target.setPointerCapture(e.pointerId);
	};

	const onPreviewPointerMove = (e: PointerEvent) => {
		if (!previewDragging) {return;}
		if (previewDragStart.pointerX === INITIAL_POINT && previewDragStart.pointerY === INITIAL_POINT) {
			previewDragStart = { pointerX: e.clientX, pointerY: e.clientY };
		}
		previewOffset = {
			x: e.clientX - previewDragStart.pointerX,
			y: e.clientY - previewDragStart.pointerY
		};
		if (Math.hypot(previewOffset.x, previewOffset.y) > DRAG_THRESHOLD) {
			previewDidDrag = true;
		}
		hoverGap = gapIndexUnderPoint(e.clientX, e.clientY);
	};

	const onPreviewPointerUp = (e: PointerEvent) => {
		if (!previewDragging) {return;}
		previewDragging = false;
		const target = e.currentTarget as HTMLElement;
		try {
			target.releasePointerCapture(e.pointerId);
		} catch {}
		const idx = gapIndexUnderPoint(e.clientX, e.clientY);
		previewOffset = { x: 0, y: 0 };
		hoverGap = null;
		if (previewDidDrag && idx !== null) {
			pendingGap = idx;
		}
	};

	const onPreviewPointerCancel = () => {
		previewDragging = false;
		previewOffset = { x: 0, y: 0 };
		hoverGap = null;
	};

	const onPreviewClick = (i: number) => {
		// Suppress the click that follows a drag — pointerup already updated pendingGap.
		if (previewDidDrag) {
			previewDidDrag = false;
			return;
		}
		commitPlacement(i);
	};

	const onGapClick = (i: number) => {
		if (!active || phase !== 'placing') {return;}
		// If a card is already pending, clicking a different gap moves the pending
		// Preview rather than committing — the user must confirm via the preview card.
		if (pendingGap !== null) {
			pendingGap = i;
			return;
		}
		commitPlacement(i);
	};

	const newRound = () => {
		// Trigger a fresh server load with same params
		const url = new URL(window.location.href);
		url.searchParams.set('_', String(Date.now()));
		goto(url.pathname + url.search, { invalidateAll: true });
		// Reset local state on the new mount via key-based remount below
	};

	const backToSettings = () => {
		goto('/');
	}

	// Reset state when round.songs changes (after newRound triggers reload)
	$effect(() => {
		const {songs} = data.round;
		placed = [songs[FIRST_SONG_INDEX]];
		queueIdx = FIRST_QUEUE_INDEX;
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
				<span>{timeRangeSummary}</span>
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
						aria-label={'Place here (slot ' + (i + 1) + ')'}
						onclick={() => onGapClick(i)}
						disabled={phase !== 'placing'}
					>
						<span class="gap__rule"></span>
						{#if phase === 'placing' && pendingGap !== i}
							<span class="gap__label gap__label--persistent">
								<span class="gap__verb gap__verb--mouse">Click</span><span
									class="gap__verb gap__verb--touch">Tap</span
								> to place here
							</span>
						{:else if phase !== 'placing'}
							<span class="gap__pin"></span>
						{/if}
					</button>
				</li>
				{#if pendingGap === i && active && phase === 'placing'}
					<li class="row row--card row--preview">
						<button
							type="button"
							class="placed placed--preview"
							class:placed--preview-dragging={previewDragging}
							style="transform: translate({previewOffset.x}px, {previewOffset.y}px);"
							onclick={() => onPreviewClick(i)}
							onpointerdown={onPreviewPointerDown}
							onpointermove={onPreviewPointerMove}
							onpointerup={onPreviewPointerUp}
							onpointercancel={onPreviewPointerCancel}
							aria-label="Click to place here, or drag to move"
						>
							<div class="placed__year">
								<span>????</span>
								<span class="placed__mark placed__mark--placeholder" aria-hidden="true"></span>
							</div>
							<div class="placed__img" style="--bg-img: url({active.image})"></div>
							<div class="placed__meta">
								<div class="placed__title" title={active.title}>{active.title}</div>
								<div class="placed__artist" title={active.artist}>{active.artist}</div>
							</div>
							<span class="placed__confirm">Click to place here</span>
						</button>
					</li>
				{/if}
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
								<span
									class="placed__mark"
									class:placed__mark--ok={placement?.correct}
									class:placed__mark--bad={placement && !placement.correct}
									class:placed__mark--placeholder={!placement}
									aria-label={placement
										? placement.correct
											? 'Correct'
											: 'Wrong'
										: 'Starting song'}
									aria-hidden={!placement}
								>
									{placement ? (placement.correct ? '✓' : '✗') : ''}
								</span>
							</div>
							<div class="placed__img" style="--bg-img: url({song.image})"></div>
							<div class="placed__meta">
								<div class="placed__title" title={song.title}>{song.title}</div>
								<div class="placed__artist" title={song.artist}>{song.artist}</div>
								{#if song.wikipediaUrl}
									<a
										class="placed__link"
										href={song.wikipediaUrl}
										target="wikipedia"
										aria-label={`Show more about ${song.title} on Wikipedia`}
									>
										Show more
									</a>
								{/if}
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
				<h2>{resultCopy.headline}</h2>
				<p class="results__comment muted">{resultCopy.comment}</p>
			</div>
			<div class="results__actions">
				<button class="btn btn--primary" onclick={newRound}>Play another</button>
				<button class="btn btn--ghost" onclick={backToSettings}>Change settings</button>
			</div>
		</section>
	{:else if active}
		{#if phase === 'placing' && pendingGap !== null}
			<!-- Preview card is shown inline at the drop position; bottom dock hides. -->
		{:else}
			<section class="active-wrap">
				{#if phase === 'reveal' && lastPlacement}
					<div class="reveal" class:reveal--ok={lastPlacement.correct} class:reveal--bad={!lastPlacement.correct}>
						{revealMessage}
					</div>
				{:else}
					<div class="prompt">
						<span class="dim">Drag this song into the timeline</span>
					</div>
				{/if}
				<article
					class="active"
					class:active--reveal={phase === 'reveal'}
					class:active--dragging={dragging}
					style="transform: translate({dragOffset.x}px, {dragOffset.y}px);"
					onpointerdown={onActivePointerDown}
					onpointermove={onActivePointerMove}
					onpointerup={onActivePointerUp}
					onpointercancel={onActivePointerCancel}
				>
					<div class="active__img" style="--bg-img: url({active.image})"></div>
					<div class="active__body">
						<div class="active__title">{active.title}</div>
						<div class="active__artist">{active.artist}</div>
						<div class="active__year">????</div>
					</div>
				</article>
			</section>
		{/if}
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
		min-height: 96px;
		padding: 14px 0;
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

	/* Pending-confirm state — emphasized line awaiting confirm via preview card */
	.gap--pending:not([disabled]) {
		min-height: 36px;
	}
	.gap--pending:not([disabled]) .gap__rule {
		background: var(--pending);
		opacity: 1;
		height: 4px;
	}

	/* Persistent (always-visible) labels: hide on devices that have a precise
	   pointer (mouse). Touch users still see the labels and tap them. */
	@media (hover: hover) and (pointer: fine) {
		.gap__label--persistent {
			display: none;
		}
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
		grid-template-columns: 80px 56px minmax(0, 1fr);
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
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
	}
	.placed__mark {
		font-family: var(--font-body);
		font-size: 14px;
		line-height: 1;
		font-weight: 700;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 20px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
	}
	.placed__mark--ok {
		color: var(--ok);
		background: rgba(102, 217, 154, 0.15);
	}
	.placed__mark--bad {
		color: var(--bad);
		background: rgba(255, 100, 112, 0.15);
	}
	.placed__mark--placeholder {
		visibility: hidden;
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
		display: grid;
		gap: 2px;
		align-content: center;
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
	.placed__link {
		justify-self: start;
		margin-top: 4px;
		padding: 4px 10px;
		border-radius: 999px;
		border: 1px solid var(--border-strong);
		background: var(--bg-elev-2);
		color: var(--accent);
		font-size: 12px;
		font-weight: 600;
		line-height: 1.2;
		transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
	}
	.placed__link:hover {
		background: rgba(255, 184, 77, 0.08);
		border-color: var(--accent);
		color: var(--fg);
	}

	/* Inline preview card shown at the drop position while pending confirm. */
	.row--preview {
		animation: previewIn 180ms ease-out;
	}
	@keyframes previewIn {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.placed--preview {
		grid-template-columns: 80px 56px minmax(0, 1fr) auto;
		cursor: grab;
		text-align: left;
		color: inherit;
		font: inherit;
		background: rgba(167, 139, 250, 0.14);
		border-color: var(--pending);
		box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.55), 0 8px 22px rgba(167, 139, 250, 0.20);
		touch-action: none;
		user-select: none;
		will-change: transform;
		transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
	}
	.placed--preview:hover,
	.placed--preview:focus-visible {
		background: rgba(167, 139, 250, 0.22);
		box-shadow: 0 0 0 2px var(--pending), 0 10px 26px rgba(167, 139, 250, 0.30);
		outline: none;
	}
	.placed--preview-dragging {
		cursor: grabbing;
		transition: none;
		box-shadow: 0 0 0 2px var(--pending), 0 18px 40px rgba(0, 0, 0, 0.45);
		z-index: 30;
	}
	.placed--preview .placed__year {
		color: var(--pending);
	}
	.placed__confirm {
		justify-self: end;
		padding: 8px 12px;
		background: var(--pending);
		color: var(--pending-ink);
		font-weight: 700;
		font-size: 12.5px;
		letter-spacing: 0.02em;
		border-radius: 999px;
		white-space: nowrap;
		box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.28);
	}
	@media (max-width: 540px) {
		.placed--preview {
			grid-template-columns: 52px 48px minmax(0, 1fr);
			grid-template-rows: auto auto;
		}
		.placed__confirm {
			grid-column: 1 / -1;
			justify-self: stretch;
			text-align: center;
			margin-top: 4px;
		}
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
		touch-action: none;
		will-change: transform;
		transition: box-shadow 200ms ease, border-color 200ms ease;
	}
	.active--dragging {
		cursor: grabbing;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px var(--accent);
		border-color: var(--accent);
		z-index: 20;
	}
	.active--reveal {
		cursor: default;
		touch-action: auto;
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
	.results__comment {
		margin: 0;
		max-width: 30ch;
		justify-self: center;
		font-size: 14px;
		line-height: 1.45;
	}

	.results__actions {
		display: flex;
		justify-content: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	@media (max-width: 540px) {
		.placed {
			grid-template-columns: 72px 48px minmax(0, 1fr);
			gap: 14px;
			padding: 10px 12px;
		}
		.placed--preview {
			grid-template-columns: 72px 48px minmax(0, 1fr);
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
