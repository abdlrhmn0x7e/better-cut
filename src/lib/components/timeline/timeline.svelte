<script lang="ts">
	import { getEditorState } from "$lib/editor/context.svelte";
	import { VideoIcon } from "@lucide/svelte";
	import Playhead from "./playhead.svelte";
	import Ticks from "./ticks.svelte";
	import * as Resizable from "$lib/components/ui/resizable/index.js";
	import { TICK_PADDING } from "./contants";
	import { setTimelineState } from "./timeline-state.svelte";

	const ctx = getEditorState();

	const timelineState = setTimelineState({
		comp: ctx.comp
	});

	function handleDrop(
		e: DragEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		const items = e.dataTransfer?.items;
		if (!items) return;

		for (const item of items) {
			if (item.kind === "string") {
				item.getAsString((id) => {
					const file = ctx.files.get(id);
					if (!file) return;

					ctx.comp?.addLayer({
						src: file,
						type: "video"
					});
				});
			}
		}
	}
</script>

<div
	class="relative h-full overflow-hidden select-none"
	ondrop={handleDrop}
	ondragover={(e) => e.preventDefault()}
	role="application"
>
	<Resizable.PaneGroup direction="horizontal">
		<Resizable.Pane class="w-96 h-full bg-card border-r" defaultSize={30}>
			<div class="size-full" bind:clientWidth={timelineState.layersPanelWidth}>Layers</div>
		</Resizable.Pane>

		<Resizable.Handle withHandle class="bg-transparent" />

		<Resizable.Pane defaultSize={70}>
			<div class="relative size-full" bind:clientWidth={timelineState.viewportWidth}>
				<!-- Playhead -->
				<Playhead />

				<!-- Zoom -->
				<div class="w-fit ml-auto flex items-center gap-2">
					<span>Zoom {timelineState.zoomFactor}x</span>
					<input type="range" bind:value={timelineState.zoomFactor} min="1" max="3" step="0.1" />
				</div>

				<!-- Ticks -->
				<Ticks />

				<!-- Layers -->
				<div class="mt-4">
					{#each timelineState.layers as layer (layer.id)}
						<div
							class="absolute rounded-sm bg-blue-500 px-2 py-1 flex items-center gap-2"
							style:left="{layer.startOffset * timelineState.pps -
								timelineState.scrollLeft +
								TICK_PADDING}px"
							style:width="{(layer.duration ?? 0) * timelineState.pps - TICK_PADDING}px"
						>
							<VideoIcon class="size-4" />
							<span class="capitalize">{layer.type}</span>
						</div>
					{/each}
				</div>
			</div>
		</Resizable.Pane>
	</Resizable.PaneGroup>
</div>
