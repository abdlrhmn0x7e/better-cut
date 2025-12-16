<script lang="ts">
	import { getEditorState } from "$lib/editor";
	import { TICK_PADDING } from "./constants";
	import { getTimelineState } from "./timeline-state.svelte";

	const editor = getEditorState();
	const timeline = getTimelineState();
</script>

<div
	class="focus:select-none absolute bottom-0 top-4 w-fit z-50"
	style:left="{(editor.activeComposition?.currentTimestamp ?? 0) * timeline.pps +
		TICK_PADDING -
		timeline.scrollLeft}px"
	draggable="false"
>
	<div class="w-px h-full bg-primary absolute top-1 left-1/2 -translate-x-1/2"></div>
	<div class="absolute top-1 size-2 bg-primary left-1/2 -translate-x-1/2"></div>
	<div class="absolute top-3 left-1/2 -translate-x-1/2 arrow-down"></div>
</div>

<style>
	.arrow-down {
		width: 0;
		height: 0;

		border-left: 4px solid transparent;
		border-right: 4px solid transparent;
		border-top: 4px solid var(--primary);
	}
</style>
