<script lang="ts">
	import { getEditorState } from "$lib/editor/editor-state.svelte";
	import { getTimelineState } from "./timeline-state.svelte";

	const editorState = getEditorState();
	const timelineState = getTimelineState();
	let trackWidth = $state(0);
	let trackEl: HTMLDivElement;
	let isDragging = $state(false);
	let lastPointerX = $state(0);

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

		const deltaX = e.clientX - lastPointerX;
		lastPointerX = e.clientX;

		// Convert thumb movement to scroll movement
		// The ratio of scrollable content to scrollbar track determines the scale
		const scrollableWidth = totalTimelineWidth - timelineState.viewportWidth;
		const availableTrackSpace = trackWidth - thumbWidth;
		const scrollScale = availableTrackSpace > 0 ? scrollableWidth / availableTrackSpace : 1;

		timelineState.scrollLeft = timelineState.scrollLeft + deltaX * scrollScale;
	}

	function handlePointerDown(
		e: PointerEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		trackEl.setPointerCapture(e.pointerId);
		isDragging = true;
		lastPointerX = e.clientX;
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
