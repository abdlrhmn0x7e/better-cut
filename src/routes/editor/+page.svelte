<script lang="ts">
	import { ProjectPanel } from "$lib/components/project-panel";
	import { Toolbar } from "$lib/components/toolbar";
	import * as Resizable from "$lib/components/ui/resizable/index.js";
	import VideoPreview from "$lib/components/video-preview.svelte";
	import { Composition, setCompisitionState } from "$lib/editor/composition/composition.svelte";
	import type { Action } from "svelte/action";

	const ctx = setCompisitionState();

	const previewAction: Action<HTMLDivElement> = (node) => {
		ctx.comp = new Composition({ container: node });
	};
</script>

<main class="h-screen flex flex-col">
	<Toolbar />

	<Resizable.PaneGroup direction="vertical" class="rounded-lg border">
		<Resizable.Pane defaultSize={50}>
			<Resizable.PaneGroup direction="horizontal">
				<Resizable.Pane defaultSize={45}>
					<div class="flex h-full items-center justify-center p-3">
						<ProjectPanel />
					</div>
				</Resizable.Pane>

				<Resizable.Handle />

				<Resizable.Pane defaultSize={55}>
					<VideoPreview action={previewAction} />
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</Resizable.Pane>

		<Resizable.Handle />

		<Resizable.Pane defaultSize={50}>
			<div class="flex items-center justify-center p-6">
				<span class="font-semibold">One</span>
			</div>
		</Resizable.Pane>
	</Resizable.PaneGroup>
</main>
