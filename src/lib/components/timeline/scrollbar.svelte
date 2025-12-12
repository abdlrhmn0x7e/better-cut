<script lang="ts">
	import { getEditorState } from "$lib/editor/context.svelte";
	import { GripVerticalIcon, MoveHorizontalIcon } from "@lucide/svelte";
	import { getTimelineState } from "./timeline-state.svelte";

	const editorState = getEditorState();
	const timelineState = getTimelineState();
	let trackWidth = $state(0);
	let trackEl: HTMLDivElement;
	let isDragging = $state(false);

	const totalTimelineWidth = $derived(editorState.comp.duration * timelineState.pps);
	const thumbWidth = $derived(
		Math.min(timelineState.viewportWidth / totalTimelineWidth, 1) * trackWidth
	);
	const thumbLeft = $derived.by(() => {
		const availableSpace = trackWidth - thumbWidth;
		const scrollRatio =
			timelineState.scrollLeft / Math.max(totalTimelineWidth - timelineState.viewportWidth, 1);
		return scrollRatio * availableSpace;
	});

	function handlePointerUp(
		e: PointerEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		trackEl.releasePointerCapture(e.pointerId);
		isDragging = false;
	}

	function handlePointerMove(
		e: PointerEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (!isDragging) return;

		const rect = trackEl.getClientRects().item(0);
		if (!rect) return;

		const thumbMiddle = rect.left + rect.left * 0.5;
		timelineState.scrollLeft = e.clientX - thumbMiddle + timelineState.scrollLeft;
	}

	function handlePointerDown(
		e: PointerEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		trackEl.setPointerCapture(e.pointerId);
		isDragging = true;
	}
</script>

<div class="w-full h-2 absolute bottom-0 -mx-1" bind:clientWidth={trackWidth}>
	<div
		class="bg-muted rounded-sm h-full absolute bottom-0 z-10 cursor-grab active:cursor-grabbing"
		bind:this={trackEl}
		style:width="{thumbWidth}px"
		style:left="{thumbLeft}px"
		onpointerup={handlePointerUp}
		onpointermove={handlePointerMove}
		onpointerdown={handlePointerDown}
	></div>
</div>
