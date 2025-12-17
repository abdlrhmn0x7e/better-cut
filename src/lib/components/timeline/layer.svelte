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

	function handleStartTimeDrag() {}

	function handleEndTimeDrag() {}
</script>

<div class="relative border-b">
	<div
		class="relative bg-background w-fit rounded-sm overflow-hidden"
		style:left="{startOffset * timeline.pps - timeline.scrollLeft + TICK_PADDING}px"
		style:width="{(layer.endTime ?? 0) * timeline.pps}px"
	>
		<div
			class={cn(
				"active:cursor-grabbing cursor-pointer border-2 border-primary outline-none rounded-sm bg-primary/75 pl-4 flex items-center gap-2",
				layer.id === editor.activeLayer?.id && "" // this should be driven from the editor state?
			)}
			{@attach draggable(onDrag)}
			style:height={LAYER_HEIGHT}
			role="button"
			tabindex="0"
			onpointerdown={handleClick}
		>
			{#if layer.type === "video"}
				<VideoIcon class="size-4" />
			{/if}

			<span class="capitalize">{layer.type}</span>

			<div class="bg-primary absolute inset-y-0 w-1.5 z-50 left-0 cursor-ew-resize">
				<span class="absolute top-1/2 left-1/4 -translate-y-1/2 text-primary-foreground">|</span>
			</div>

			<div class="bg-primary absolute inset-y-0 w-1.5 z-50 right-0 cursor-ew-resize">
				<span class="absolute top-1/2 left-1/4 -translate-y-1/2 text-primary-foreground">|</span>
			</div>
		</div>
	</div>
</div>
