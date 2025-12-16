<script lang="ts">
	import { draggable } from "$lib/attachments/draggable";
	import type { BaseLayer } from "$lib/editor/layers";
	import { cn } from "$lib/utils";
	import { VideoIcon } from "@lucide/svelte";
	import { LAYER_HEIGHT, TICK_PADDING } from "./constants";
	import { getTimelineState } from "./timeline-state.svelte";
	import { getEditorState } from "$lib/editor";

	const timeline = getTimelineState();
	const editor = getEditorState();
	const { layer }: { layer: BaseLayer } = $props();
	const startOffset = $derived(layer.startOffset);

	function handleClick() {
		editor.activeLayer = layer;
	}

	function onDrag(e: PointerEvent) {
		const delta = e.movementX / timeline.pps;
		editor.moveLayer(delta);
	}
</script>

<div class="relative border-b">
	<div
		class={cn(
			"active:cursor-grabbing relative cursor-pointer after:absolute after:inset-0 outline-none after:rounded-xs after:border-primary after:border-0 after:z-10 rounded-xs bg-accent px-2 flex items-center gap-2",
			layer.id === editor.activeLayer?.id && "after:border-2" // this should be driven from the editor state?
		)}
		{@attach draggable(onDrag)}
		style:height={LAYER_HEIGHT}
		style:left="{startOffset * timeline.pps - timeline.scrollLeft + TICK_PADDING}px"
		style:width="{(layer.endTime ?? 0) * timeline.pps}px"
		role="button"
		tabindex="0"
		onpointerdown={handleClick}
	>
		{#if layer.type === "video"}
			<VideoIcon class="size-4" />
		{/if}

		<span class="capitalize">{layer.type}</span>
	</div>
</div>
