<script lang="ts">
	import { draggable } from "$lib/attachments/draggable";
	import { getEditorState } from "$lib/editor";
	import { TICK_PADDING } from "./constants";
	import { getTimelineState } from "./timeline-state.svelte";

	const editor = getEditorState();
	let ticksEl: HTMLDivElement;
	const timeline = getTimelineState();

	function renderTime(time: number) {
		const hours = Math.floor(time / 3600);
		const mins = Math.floor((time % 3600) / 60);
		const secs = Math.floor(time % 60);

		const pad = (n: number) => n.toString().padStart(2, "0");

		if (hours > 0) return `${hours}h:${pad(mins)}m:${pad(secs)}s`;
		if (mins > 0) return `${mins}m:${pad(secs)}s`;
		return `${secs}s`;
	}

	function handleTimelineKeydown(
		e: KeyboardEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (!editor.activeComposition) return;

		const key = e.key;
		const step = 1 / editor.activeComposition.fps;
		switch (key) {
			case "ArrowRight": {
				editor.activeComposition.setCurrentTimestamp(
					editor.activeComposition.currentTimestamp + step
				);
				break;
			}

			case "ArrowLeft": {
				const comp = editor.activeComposition;
				if (comp.currentTimestamp <= 0) break;

				comp.setCurrentTimestamp(comp.currentTimestamp - step);
				break;
			}
		}
	}

	function getTime(localX: number) {
		const rect = ticksEl.getClientRects().item(0);
		if (!rect) return 0;

		const rawTime = (localX - rect.left - TICK_PADDING + timeline.scrollLeft) / timeline.pps;
		return Math.max(0, Math.min(rawTime, editor.activeComposition?.duration ?? 0));
	}

	function onDrag(e: PointerEvent) {
		if (!editor.activeComposition) return;

		editor.activeComposition.setCurrentTimestamp(getTime(e.clientX));
	}

	function handleClick(e: MouseEvent) {
		if (!editor.activeComposition) return;

		editor.activeComposition.setCurrentTimestamp(getTime(e.clientX));
	}
</script>

<div
	role="button"
	tabindex="0"
	class="timeline focus:outline-none relative overflow-hidden h-8"
	{@attach draggable(onDrag)}
	onkeydown={handleTimelineKeydown}
	onpointerdown={handleClick}
	bind:this={ticksEl}
>
	{#each timeline.mainTicks as tick, index (`tick-${tick.time}-${tick.pos}`)}
		<div
			class="pointer-events-none absolute bottom-0 flex flex-col items-center gap-1 z-10 bg-background w-px"
			style:left="{tick.pos}px"
		>
			<span
				class="text-xs font-semibold text-muted-foreground {index === 0 && 'pl-3'} {index ===
					timeline.mainTicks.length - 1 && 'pr-12'}">{renderTime(tick.time)}</span
			>
			<div class="h-2 w-px bg-muted-foreground"></div>
		</div>
	{/each}
</div>

<style>
	.timeline {
		user-select: none;
		touch-action: none;
	}
</style>
