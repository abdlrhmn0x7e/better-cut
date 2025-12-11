<script lang="ts">
	import { getEditorState } from "$lib/editor/context.svelte";
	import { VideoIcon } from "@lucide/svelte";

	const ctx = getEditorState();
	const layers = $derived(ctx.comp?.layers ?? []);

	const TARGET_TICK_WIDTH = 200; // desired tick width in pixels
	const TICK_INTERVALS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 300]; // in seconds

	let scrollLeft = $state(0);
	let viewportWidth = $state(0);
	let zoomFactor = $state(1);
	let pps = $derived((viewportWidth / (ctx.comp?.duration ?? 1)) * zoomFactor); // pixels per second

	let tickInterval = $derived.by(() => {
		for (const int of TICK_INTERVALS) {
			if (int * pps >= TARGET_TICK_WIDTH) return int;
		}

		return TICK_INTERVALS.at(-1)!;
	});

	const startTickTime = $derived.by(() => {
		const visibleStartTime = scrollLeft / pps;
		return Math.floor(visibleStartTime / tickInterval) * tickInterval;
	});

	const endTickTime = $derived.by(() => {
		const visibleEndTime = (scrollLeft + viewportWidth) / pps;
		return Math.floor(visibleEndTime / tickInterval) * tickInterval;
	});

	function getTicks({
		startTime,
		endTime,
		interval,
		pps,
		offset
	}: {
		pps: number;
		startTime: number;
		endTime: number;
		interval: number;
		offset: number;
	}) {
		const length = Math.ceil((endTime - startTime) / interval) + 1;
		if (isNaN(length) || length < 0) return []; // validations

		return [...Array(length).keys()].map((i) => {
			const time = i * interval + startTime;
			const pos = time * pps - offset;
			return { time, pos };
		});
	}

	const ticks = $derived.by(() =>
		getTicks({
			pps,
			startTime: startTickTime,
			endTime: endTickTime,
			interval: tickInterval,
			offset: scrollLeft
		})
	);

	const subTicks = $derived.by(() =>
		getTicks({
			pps,
			startTime: startTickTime,
			endTime: endTickTime,
			interval: tickInterval / 4,
			offset: scrollLeft
		})
	);

	function renderTime(time: number) {
		const hours = Math.floor(time / 60 / 60);
		const mins = Math.floor(time / 60);
		const secs = time % 60;
		let result = "";

		if (hours) result += `${hours}:`;
		if (mins) result += `${mins}:`;
		result += `${secs}`;

		return result;
	}

	function timelineClick(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (!ctx.comp) return;
		const time = e.x / pps;
		ctx.comp.currentTimestamp = time;
		ctx.comp.seek(time);
	}

	function handleTimelineKeydown(
		e: KeyboardEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		if (!ctx.comp) return;

		const key = e.key;
		switch (key) {
			case "ArrowRight": {
				ctx.comp.currentTimestamp += 1;
				break;
			}

			case "ArrowLeft": {
				if (ctx.comp.currentTimestamp <= 0) break;

				ctx.comp.currentTimestamp -= 1;
				break;
			}
		}
	}

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
	class="relative h-full overflow-hidden p-2"
	ondrop={handleDrop}
	ondragover={(e) => e.preventDefault()}
	role="application"
	bind:clientWidth={viewportWidth}
>
	<!-- Playhead -->
	<div
		class="absolute inset-y-0 w-px bg-red-500 z-50"
		style:left="{(ctx.comp?.currentTimestamp ?? 0) * pps}px"
	></div>

	<!-- Zoom -->
	<div class="w-fit ml-auto flex items-center gap-2">
		<span>Zoom {zoomFactor}x</span>
		<input type="range" bind:value={zoomFactor} min="1" max="3" step="0.1" />
	</div>

	<!-- Ticks -->
	<div
		role="button"
		tabindex="0"
		class="relative overflow-hidden h-9"
		onclick={timelineClick}
		onkeydown={handleTimelineKeydown}
	>
		{#each ticks as tick (`tick-${tick.time}`)}
			<div
				class="pointer-events-none absolute top-0 flex flex-col items-center gap-1 z-10 bg-background pb-2"
				style:left="{tick.pos}px"
			>
				<span class="text-xs font-semibold">{renderTime(tick.time)}</span>
				<div class="h-3 w-px bg-muted mt-auto"></div>
			</div>
		{/each}

		{#each subTicks as tick (`tick-${tick.time}`)}
			<div
				class="pointer-events-none absolute bottom-0 flex flex-col items-center gap-1"
				style:left="{tick.pos}px"
			>
				<div class="h-2 w-px bg-muted"></div>
			</div>
		{/each}
	</div>

	<!-- Layers -->
	<div class="mt-4">
		{#each layers as layer (layer.id)}
			<div
				class="absolute rounded-sm bg-blue-500 px-2 py-1 flex items-center gap-2"
				style:left="{layer.startOffset * pps - scrollLeft}px"
				style:width="{(layer.duration ?? 0) * pps}px"
			>
				<VideoIcon class="size-4" />
				<span class="capitalize">{layer.type}</span>
			</div>
		{/each}
	</div>
</div>
