<script lang="ts">
	import { getEditorState } from "$lib/editor/context.svelte";
	import { TICK_PADDING } from "./contants";
	import { getTimelineState } from "./timeline-state.svelte";

	const ctx = getEditorState();
	const timelineState = getTimelineState();

	let ticksEl: HTMLDivElement;
	let isDragging = $state(false);

	function renderTime(time: number) {
		const hours = Math.floor(time / 3600);
		const mins = Math.floor((time % 3600) / 60);
		const secs = Math.floor(time % 60);

		const pad = (n: number) => n.toString().padStart(2, "0");

		if (hours > 0) return `${hours}:${pad(mins)}:${pad(secs)}`;
		if (mins > 0) return `${mins}:${pad(secs)}`;
		return `${secs}`;
	}

	function handleTimelineKeydown(
		e: KeyboardEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (!ctx.comp) return;

		const key = e.key;
		const step = 1 / ctx.comp.fps;
		switch (key) {
			case "ArrowRight": {
				ctx.comp.setCurrentTimestamp(ctx.comp.currentTimestamp + step);
				break;
			}

			case "ArrowLeft": {
				if (ctx.comp.currentTimestamp <= 0) break;

				ctx.comp.setCurrentTimestamp(ctx.comp.currentTimestamp - step);
				break;
			}
		}
	}

	function handlePointerUp(
		e: PointerEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		ticksEl.releasePointerCapture(e.pointerId);

		isDragging = false;
	}

	function getTime(localX: number) {
		const rect = ticksEl.getClientRects().item(0);
		if (!rect) return 0;

		const rawTime =
			(localX - rect.left - TICK_PADDING + timelineState.scrollLeft) / timelineState.pps;
		return Math.max(0, Math.min(rawTime, ctx.comp.duration));
	}

	function handlePointerDown(
		e: PointerEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		ticksEl.setPointerCapture(e.pointerId); // makes sure the pointer up event is fired

		if (!ctx.comp || !ticksEl) return;

		ctx.comp.setCurrentTimestamp(getTime(e.clientX));

		isDragging = true;
	}

	function handlePointerMove(
		e: PointerEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (!isDragging) return;

		if (!ctx.comp) return;

		ctx.comp.setCurrentTimestamp(getTime(e.clientX));
	}
</script>

<div
	bind:this={ticksEl}
	role="button"
	tabindex="0"
	class="timeline focus:outline-none relative overflow-hidden h-9"
	onpointerup={handlePointerUp}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onkeydown={handleTimelineKeydown}
>
	{#each timelineState.mainTicks as tick (`tick-${tick.time}`)}
		<div
			class="pointer-events-none absolute top-0 flex flex-col items-center gap-1 z-10 bg-background w-px"
			style:left="{tick.pos}px"
		>
			<span class="text-xs font-semibold">{renderTime(tick.time)}</span>
			<div class="h-3 w-px bg-muted"></div>
		</div>
	{/each}

	{#each timelineState.subTicks as tick (`tick-${tick.time}`)}
		<div
			class="pointer-events-none absolute bottom-0 flex flex-col items-center gap-1"
			style:left="{tick.pos}px"
		>
			<div class="h-2 w-px bg-muted"></div>
		</div>
	{/each}
</div>

<style>
	.timeline {
		user-select: none;
		touch-action: none;
	}
</style>
