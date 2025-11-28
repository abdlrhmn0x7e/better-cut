<script lang="ts">
	import { getEditorState } from "$lib/editor/context.svelte";
	import FileCard from "./file-card.svelte";

	import * as Empty from "$lib/components/ui/empty/index.js";
	import { FolderXIcon } from "@lucide/svelte";
	import ImportVideo from "../toolbar/import-video.svelte";
	import { buttonVariants } from "../ui/button";

	const ctx = getEditorState();
</script>

<div class="space-y-2 h-full">
	{#if ctx.files.length === 0}
		<Empty.Root class="h-full">
			<Empty.Header>
				<Empty.Media variant="icon">
					<FolderXIcon />
				</Empty.Media>
				<Empty.Title>No Project Files Yet</Empty.Title>
				<Empty.Description>
					You haven't added any project files yet. Get started by creating importing your first file
					through the toolbar menu
				</Empty.Description>
				<Empty.Content>
					<ImportVideo class={buttonVariants({})} />
				</Empty.Content>
			</Empty.Header>
		</Empty.Root>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each ctx.files as file ((file.name, file.type, file.lastModified))}
				<FileCard {file} />
			{/each}
		</div>
	{/if}
</div>
