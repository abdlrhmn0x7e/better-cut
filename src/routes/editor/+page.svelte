<script lang="ts">
	import { ProjectFiles } from "$lib/components/project-files";
	import { Toolbar } from "$lib/components/toolbar";
	import * as Resizable from "$lib/components/ui/resizable/index.js";
	import VideoPreview from "$lib/components/video-preview.svelte";
	import type { Action } from "svelte/action";

	import { setEditorState } from "$lib/editor/context.svelte";
	import { Composition } from "$lib/editor/composition";
	import Timeline from "$lib/components/timeline/timeline.svelte";

	const ctx = setEditorState();

	// this is here because I wanted all initializations to live in the root page
	const previewAction: Action<HTMLDivElement> = (node) => {
		ctx.comp = new Composition({ container: node });
	};

	// adjust the size of the preview on every resize
	// TODO: I should probably throttle this
	function handlePreviewResize() {
		if (!ctx.comp) return;

		ctx.comp.rescale();
	}
</script>

<main class="h-screen flex flex-col">
	<Toolbar />

	<Resizable.PaneGroup
		direction="vertical"
		class="rounded-lg border"
		onLayoutChange={handlePreviewResize}
	>
		<Resizable.Pane defaultSize={50}>
			<Resizable.PaneGroup direction="horizontal" onLayoutChange={handlePreviewResize}>
				<Resizable.Pane defaultSize={30}>
					<ProjectFiles />
				</Resizable.Pane>

				<Resizable.Handle />

				<Resizable.Pane defaultSize={50}>
					<VideoPreview action={previewAction} />
				</Resizable.Pane>

				<Resizable.Handle />

				<Resizable.Pane defaultSize={20}>
					<div>Something else I don't know yet.</div>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</Resizable.Pane>

		<Resizable.Handle />

		<Resizable.Pane defaultSize={50}>
			<Timeline />
		</Resizable.Pane>
	</Resizable.PaneGroup>
</main>
