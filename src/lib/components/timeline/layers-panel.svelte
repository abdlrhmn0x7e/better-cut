<script lang="ts">
	import { getEditorState } from "$lib/editor";
	import { TrashIcon } from "@lucide/svelte";
	import { Button } from "../ui/button";
	import { LAYER_HEIGHT } from "./constants";
	import { getTimelineState } from "./timeline-state.svelte";

	const timeline = getTimelineState();
	const editor = getEditorState();
</script>

<div class="size-full flex flex-col divide-y">
	<div class="w-full h-8 flex items-center">
		<p class="font-medium">Layers Panel Options</p>
	</div>
	<div class="flex-1 size-full divide-y">
		{#each timeline.layers as layer (layer.id)}
			<div style:height={LAYER_HEIGHT} class="w-full bg-card flex items-center gap-1">
				<Button variant="ghost" size="icon-sm" onclick={() => editor.deleteLayer(layer.id)}>
					<TrashIcon />
				</Button>
			</div>
		{/each}
	</div>
</div>
