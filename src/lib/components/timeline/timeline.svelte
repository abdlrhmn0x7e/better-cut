<script lang="ts">
	import * as Resizable from "$lib/components/ui/resizable/index.js";

	// const ctx = getEditorState();

	// const timelineState = setTimelineState({
	// 	comp: ctx.comp
	// });

	// function handleDrop(
	// 	e: DragEvent & {
	// 		currentTarget: EventTarget & HTMLDivElement;
	// 	}
	// ) {
	// 	const items = e.dataTransfer?.items;
	// 	if (!items) return;

	// 	for (const item of items) {
	// 		if (item.kind === "string") {
	// 			item.getAsString((id) => {
	// 				const file = ctx.files.get(id);
	// 				if (!file) return;

	// 				ctx.comp?.addLayer({
	// 					src: file,
	// 					type: "video"
	// 				});
	// 			});
	// 		}
	// 	}
	// }

	// function handleMouseWheel(
	// 	e: WheelEvent & {
	// 		currentTarget: EventTarget & HTMLDivElement;
	// 	}
	// ) {
	// 	if (!ctx.comp) return;
	// 	if (e.shiftKey) {
	// 		timelineState.scrollLeft = Math.max(e.deltaY + timelineState.scrollLeft, 0);
	// 	}

	// 	if (e.ctrlKey) {
	// 		e.preventDefault();
	// 		const step = 0.5;
	// 		const signedStep = step * ((e.deltaY * -1) / Math.abs(e.deltaY)); // invert the direction of scrolling
	// 		const newZoom = parseFloat((signedStep + timelineState.zoomFactor).toFixed(2));

	// 		timelineState.zoomFactor = Math.min(Math.max(newZoom, 1), 4);
	// 	}
	// }
</script>

<div
	role="application"
	ondragover={(e) => e.preventDefault()}
	class="relative h-full overflow-hidden select-none flex flex-col divide-y"
>
	<Resizable.PaneGroup direction="horizontal">
		<Resizable.Pane class="h-full border-r" defaultSize={25}>
			<!-- <LayersPanel /> -->
		</Resizable.Pane>

		<Resizable.Handle withHandle class="bg-transparent" />

		<Resizable.Pane>
			<div class="relative size-full flex flex-col divide-y">
				<!-- Playhead -->
				<!-- <Playhead /> -->

				<!-- Ticks -->
				<!-- <Ticks /> -->

				<!-- Layers -->
				<div class="flex-1 bg-card">
					<!-- {#each timelineState.layers as layer (layer.id)}
						<Layer {layer} />
					{/each} -->
				</div>

				<!-- Scrollbar -->
				<!-- <Scrollbar /> -->
			</div>
		</Resizable.Pane>
	</Resizable.PaneGroup>

	<!-- Zoom -->
	<!-- <div class="p-0.5 w-fit ml-auto flex items-center gap-2">
		<span>Zoom {timelineState.zoomFactor}x</span>
		<input type="range" bind:value={timelineState.zoomFactor} min="1" max="4" step="0.1" />
	</div> -->
</div>
