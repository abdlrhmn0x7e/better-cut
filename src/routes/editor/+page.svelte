<script lang="ts">
	import type { Action } from "svelte/action";

	import { setEditorState } from "$lib/editor/context.svelte";

	import { Toolbar } from "$lib/components/toolbar";
	import * as Resizable from "$lib/components/ui/resizable/index.js";

	import VideoPreview from "$lib/components/video-preview.svelte";
	import ProjectPanel from "$lib/components/project-panel/panel.svelte";
	import Timeline from "$lib/components/timeline/timeline.svelte";
	import { supportsWebCodecs } from "$lib/editor/capabilities";

	const ctx = setEditorState();

	// this is here because I wanted all initializations to live in the root page
	const previewAction: Action<HTMLCanvasElement> = (node) => {
		ctx.comp.canvas = node;
	};

	// adjust the size of the preview on every resize
	// TODO: I should probably throttle this
	function handlePreviewResize() {
		if (!ctx.comp) return;

		ctx.comp.rescale();
	}

	console.log("WEB CODECS SUPPORT", supportsWebCodecs());
</script>

<main class="h-screen flex flex-col">
	{#if supportsWebCodecs() && ctx.comp}
		<Toolbar />

		<Resizable.PaneGroup direction="vertical" onLayoutChange={handlePreviewResize}>
			<Resizable.Pane defaultSize={50}>
				<Resizable.PaneGroup class="" direction="horizontal" onLayoutChange={handlePreviewResize}>
					<Resizable.Pane class="pr-4" defaultSize={30}>
						<ProjectPanel />
					</Resizable.Pane>

					<Resizable.Handle withHandle class="bg-transparent" />

					<Resizable.Pane defaultSize={50}>
						<VideoPreview action={previewAction} />
					</Resizable.Pane>

					<Resizable.Handle withHandle class="bg-transparent" />

					<Resizable.Pane class="pl-4" defaultSize={20}>
						<div class="size-full">Layer/Effect Options</div>
					</Resizable.Pane>
				</Resizable.PaneGroup>
			</Resizable.Pane>

			<Resizable.Handle />

			<Resizable.Pane defaultSize={50}>
				<Timeline />
			</Resizable.Pane>
		</Resizable.PaneGroup>
	{:else}
		<p>Your browser isn't supported</p>
	{/if}
</main>
