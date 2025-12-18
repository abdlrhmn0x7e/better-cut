<script lang="ts">
	import * as Empty from "$lib/components/ui/empty/index.js";
	import * as Resizable from "$lib/components/ui/resizable/index.js";
	import { getEditorState } from "$lib/editor";
	import Layer from "./layer.svelte";
	import LayersPanel from "./layers-panel.svelte";
	import Playhead from "./playhead.svelte";
	import Scrollbar from "./scrollbar.svelte";
	import Ticks from "./ticks.svelte";
	import { setTimelineState } from "./timeline-state.svelte";

	const editor = getEditorState();
	const timeline = setTimelineState();

	function handleDrop(
		e: DragEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		const items = e.dataTransfer?.items;
		if (!items) return;

		for (const item of items) {
			if (item.kind === "string") {
				item.getAsString((fileId) => {
					// if there's no current comp create a new one for this layer
					if (!editor.activeComposition) {
						const comp = editor.createComposition();
						editor.activeComposition = comp;
					}

					void editor.addLayer({ type: "video", startOffset: 0, fileId, zIndex: 0 });
				});
			}
		}
	}

	function handleMouseWheel(
		e: WheelEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (!editor.activeComposition) return;
		if (e.shiftKey) {
			timeline.scrollLeft = Math.max(e.deltaY + timeline.scrollLeft, 0);
		}

		if (e.ctrlKey) {
			e.preventDefault();
			const step = 0.5;
			const signedStep = step * ((e.deltaY * -1) / Math.abs(e.deltaY)); // invert the direction of scrolling
			const newZoom = parseFloat((signedStep + timeline.zoomFactor).toFixed(2));

			timeline.zoomFactor = Math.min(Math.max(newZoom, 1), 4);
		}
	}
</script>

<div
	role="application"
	ondrop={handleDrop}
	ondragover={(e) => e.preventDefault()}
	class="h-full relative overflow-hidden select-none"
>
	{#if !editor.activeComposition}
		<Empty.Root class="w-full h-full">
			<Empty.Header>
				<Empty.Title>No Composition Selected</Empty.Title>
				<Empty.Description>Start by creating new composition</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		<div class="h-full flex flex-col divide-y" onwheel={handleMouseWheel}>
			<Resizable.PaneGroup direction="horizontal" class="flex-1">
				<Resizable.Pane class="h-full border-r" defaultSize={25}>
					<LayersPanel />
				</Resizable.Pane>

				<Resizable.Handle withHandle class="bg-transparent" />

				<Resizable.Pane>
					<div
						class="relative size-full flex flex-col divide-y"
						bind:clientWidth={timeline.viewportWidth}
					>
						<!-- Playhead -->
						<Playhead />

						<!-- Ticks -->
						<Ticks />

						<!-- Layers -->
						<div class="flex-1 bg-card">
							{#each timeline.layers as layer (layer.id)}
								<Layer {layer} />
							{/each}
						</div>

						<!-- Scrollbar -->
						<Scrollbar />
					</div>
				</Resizable.Pane>
			</Resizable.PaneGroup>

			<!-- Zoom -->
			<div class="shrink-0 p-0.5 w-fit ml-auto flex items-center gap-2">
				<span>Zoom {timeline.zoomFactor}x</span>
				<input type="range" bind:value={timeline.zoomFactor} min="1" max="4" step="0.1" />
			</div>
		</div>
	{/if}
</div>
