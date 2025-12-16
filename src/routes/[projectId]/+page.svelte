<script lang="ts">
	import { Toolbar } from "$lib/components/toolbar";
	import * as Resizable from "$lib/components/ui/resizable/index.js";

	import ProjectPanel from "$lib/components/project-panel/panel.svelte";
	import Timeline from "$lib/components/timeline/timeline.svelte";
	import { supportsWebCodecs } from "$lib/editor/capabilities";
	import type { PageProps } from "./$types";
	import { setEditorState } from "$lib/editor";
	import * as Empty from "$lib/components/ui/empty";
	import { Spinner } from "$lib/components/ui/spinner";
	import { fade } from "svelte/transition";
	import VideoPreview from "$lib/components/video-preview.svelte";

	const { params }: PageProps = $props();
	const editor = setEditorState(params.projectId);
</script>

<main class="h-screen overflow-hidden flex flex-col">
	{#if editor.status === "loading"}
		<div transition:fade={{ duration: 100 }} class="fixed inset-0">
			<Empty.Root class="size-full">
				<Empty.Header>
					<Empty.Media variant="icon">
						<Spinner />
					</Empty.Media>
					<Empty.Title>Loading Project</Empty.Title>
					<Empty.Description>
						Please wait while we load your project. Do not refresh the page.
					</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		</div>
	{:else if supportsWebCodecs() && editor.status === "ready"}
		<div transition:fade={{ duration: 100 }} class="flex-1 size-full flex flex-col">
			<Toolbar />

			<Resizable.PaneGroup direction="vertical" class="flex-1">
				<Resizable.Pane defaultSize={50}>
					<Resizable.PaneGroup direction="horizontal">
						<Resizable.Pane defaultSize={30}>
							<ProjectPanel />
						</Resizable.Pane>

						<Resizable.Handle withHandle />

						<Resizable.Pane defaultSize={50}>
							<VideoPreview />
						</Resizable.Pane>

						<Resizable.Handle withHandle />

						<Resizable.Pane>
							<div class="size-full">Layer/Effect Options</div>
						</Resizable.Pane>
					</Resizable.PaneGroup>
				</Resizable.Pane>

				<Resizable.Handle />

				<Resizable.Pane defaultSize={50} class="h-full">
					<Timeline />
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</div>
	{:else if editor.status === "error"}
		<p>Something went wrong</p>
	{:else}
		<p>Your browser isn't supported</p>
	{/if}
</main>
