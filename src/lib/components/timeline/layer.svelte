<script lang="ts">
	import type { BaseLayer } from "$lib/editor/layers";
	import { VideoIcon } from "@lucide/svelte";
	import { LAYER_HEIGHT, TICK_PADDING } from "./constants";
	import { getTimelineState } from "./timeline-state.svelte";

	const timelineState = getTimelineState();
	const { layer }: { layer: BaseLayer } = $props();
</script>

<div
	class="absolute rounded-xs bg-blue-500 px-2 flex items-center gap-2"
	style:height={LAYER_HEIGHT}
	style:left="{layer.startOffset * timelineState.pps - timelineState.scrollLeft + TICK_PADDING}px"
	style:width="{(layer.duration ?? 0) * timelineState.pps}px"
>
	{#if layer.type === "video"}
		<VideoIcon class="size-4" />
	{/if}

	<span class="capitalize">{layer.type}</span>
</div>
