<script lang="ts">
	import { getEditorState } from "$lib/editor/context.svelte";
	import { TICK_PADDING } from "./contants";
	import { getTimelineState } from "./timeline-state.svelte";

	const ctx = getEditorState();
	const timelineState = getTimelineState();

	let ticksEl: HTMLDivElement;
	let isDragging = $state(false);

	function renderTime(time: number) {
		const hours = Math.floor(time / 60 / 60);
		const mins = Math.floor(time / 60);
		const secs = time % 60;
		let result = "";

		if (hours) result += `${hours}:`;
		if (mins) result += `${mins}:`;
		result += `${secs}`;

		return result;
	}

	function handleTimelineKeydown(
		e: KeyboardEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (!ctx.comp) return;

		const key = e.key;
		switch (key) {
			case "ArrowRight": {
				ctx.comp.setCurrentTimestamp(ctx.comp.currentTimestamp + 1);
				break;
			}

			case "ArrowLeft": {
				if (ctx.comp.currentTimestamp <= 0) break;

				ctx.comp.setCurrentTimestamp(ctx.comp.currentTimestamp - 1);
				break;
			}
		}
	}

	function handlePointerUp() {
		isDragging = false;
	}

	function handlePointerDown(
		e: PointerEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (!ctx.comp || !ticksEl) return;

		ticksEl.setPointerCapture(e.pointerId); // makes sure the pointer up event is fired

		const time =
			(e.x - timelineState.layersPanelWidth - TICK_PADDING + timelineState.scrollLeft) /
			timelineState.pps;
		ctx.comp.setCurrentTimestamp(time);

		isDragging = true;
	}

	function handlePointerMove(
		e: PointerEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (!isDragging) return;

		if (!ctx.comp) return;
		const time =
			(e.x - timelineState.layersPanelWidth - TICK_PADDING + timelineState.scrollLeft) /
			timelineState.pps;
		ctx.comp.setCurrentTimestamp(time);
	}

	function handleMouseWheel(
		e: WheelEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (!ctx.comp) return;
		if (!e.shiftKey) return;

		const normalizedDeltaY = e.deltaY / 4;
		timelineState.scrollLeft = Math.max(normalizedDeltaY + timelineState.scrollLeft, 0);
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
	onwheel={handleMouseWheel}
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
