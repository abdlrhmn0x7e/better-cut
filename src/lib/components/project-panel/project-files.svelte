<script lang="ts">
	import { getEditorState } from "$lib/editor/editor-state.svelte";
	import FileCard from "./file-card.svelte";

	import * as Empty from "$lib/components/ui/empty/index.js";
	import { FolderXIcon } from "@lucide/svelte";
	import ImportFiles from "../toolbar/import-files.svelte";
	import { buttonVariants } from "../ui/button";

	const ctx = getEditorState();
	const files = $derived(Array.from(ctx.files.entries()));
</script>

<div class="space-y-2 h-full">
	{#if files.length === 0}
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
					<ImportFiles class={buttonVariants({})} />
				</Empty.Content>
			</Empty.Header>
		</Empty.Root>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each files as [id, file] (id)}
				<FileCard {id} {file} />
			{/each}
		</div>
	{/if}
</div>
