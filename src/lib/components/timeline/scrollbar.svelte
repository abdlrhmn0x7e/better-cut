<script lang="ts">
	import { getEditorState } from "$lib/editor/context.svelte";
	import { getTimelineState } from "./timeline-state.svelte";

	const editorState = getEditorState();
	const timelineState = getTimelineState();
	let trackWidth = $state(0);

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
</script>

<div class="w-full h-2 absolute bottom-0 -mx-1" bind:clientWidth={trackWidth}>
	<div
		class="bg-muted rounded-sm h-full absolute bottom-0 z-10"
		style:width="{thumbWidth}px"
		style:left="{thumbLeft}px"
	></div>
</div>
