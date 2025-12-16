<script lang="ts">
	import { LAYER_HEIGHT } from "./constants";
	import { getTimelineState } from "./timeline-state.svelte";

	const timeline = getTimelineState();
</script>

<div class="size-full flex flex-col divide-y">
	<div class="w-full h-8 flex items-center">
		<p class="font-medium">Layers Panel Options</p>
	</div>
	<div class="flex-1 size-full divide-y">
		{#each timeline.layers as layer (layer.id)}
			<div style:height={LAYER_HEIGHT} class="w-full bg-card text-center">Layer Options</div>
		{/each}
	</div>
</div>
