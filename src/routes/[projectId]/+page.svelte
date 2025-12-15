<script lang="ts">
	import { Toolbar } from "$lib/components/toolbar";
	import * as Resizable from "$lib/components/ui/resizable/index.js";

	import ProjectPanel from "$lib/components/project-panel/panel.svelte";
	import Timeline from "$lib/components/timeline/timeline.svelte";
	import { supportsWebCodecs } from "$lib/editor/capabilities";
	import type { PageProps } from "./$types";
	import { setProject } from "$lib/project";

	const { data }: PageProps = $props();
	const project = setProject(data.project);
	console.log("Loaded project:", project.name);
</script>

<main class="h-screen flex flex-col">
	{#if supportsWebCodecs()}
		<Toolbar />

		<Resizable.PaneGroup direction="vertical">
			<Resizable.Pane defaultSize={50}>
				<Resizable.PaneGroup direction="horizontal">
					<Resizable.Pane defaultSize={30}>
						<ProjectPanel />
					</Resizable.Pane>

					<Resizable.Handle withHandle class="bg-transparent" />

					<Resizable.Pane defaultSize={50}>
						<!-- <VideoPreview action={previewAction} /> -->
					</Resizable.Pane>

					<Resizable.Handle withHandle class="bg-transparent" />

					<Resizable.Pane>
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
