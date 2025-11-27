<script lang="ts">
	import { getEditorState } from "$lib/editor/context.svelte";
	import FileRow from "./file-row.svelte";

	import * as Table from "../ui/table";
	import * as Empty from "$lib/components/ui/empty/index.js";
	import { FolderXIcon } from "@lucide/svelte";
	import ImportVideo from "../toolbar/import-video.svelte";
	import { buttonVariants } from "../ui/button";

	const ctx = getEditorState();
</script>

<div class="py-4 space-y-2 h-full">
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
		<div class="space-y-1 divide-y">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head class="max-w-24">Type</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each ctx.files as file ((file.name, file.type, file.lastModified))}
						<FileRow {file} />
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>
