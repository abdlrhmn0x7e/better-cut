<script lang="ts">
	import { getTimelineState } from "./timeline-state.svelte";

	const timelineState = getTimelineState();
	const width = $derived(
		(timelineState.endTickTime - timelineState.startTickTime) * timelineState.pps
	);
	$inspect("width", width);
</script>

<div class="bg-muted h-3 absolute bottom-2" style:width="{width}px"></div>
