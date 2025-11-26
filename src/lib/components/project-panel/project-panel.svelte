<script lang="ts">
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { FilesIcon } from "@lucide/svelte";
</script>

<Tabs.Root value="files" class="size-full flex-row" orientation="vertical">
	<Tabs.List class="h-fit flex-col">
		<Tabs.Trigger value="files" class="flex-col px-4 py-2">
			<FilesIcon />
			Files
		</Tabs.Trigger>

		<Tabs.Trigger value="file" class="flex-col px-4 py-2">
			<FilesIcon />
			Files
		</Tabs.Trigger>

		<Tabs.Trigger value="file" class="flex-col px-4 py-2">
			<FilesIcon />
			Files
		</Tabs.Trigger>

		<Tabs.Trigger value="file" class="flex-col px-4 py-2">
			<FilesIcon />
			Files
		</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="files" class="p-1">
		<p>Maybe Some Files?</p>
	</Tabs.Content>
</Tabs.Root>
