<script lang="ts">
	import ProjectFiles from "./project-files.svelte";

	import { Card, CardContent } from "$lib/components/ui/card";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { AccessibilityIcon, FilesIcon } from "@lucide/svelte";
</script>

<Card class="size-full p-1">
	<CardContent class="p-0 size-full">
		<Tabs.Root value="files" class="flex-row size-full">
			<Tabs.List class="flex-col h-fit bg-background">
				<Tabs.Trigger value="files" class="w-full cursor-pointer flex-col">
					<FilesIcon />
					Files
				</Tabs.Trigger>
				<Tabs.Trigger value="idk" class="w-full cursor-pointer flex-col">
					<AccessibilityIcon />
					Idk
				</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="files" class="size-full p-2">
				<ProjectFiles />
			</Tabs.Content>
		</Tabs.Root>
	</CardContent>
</Card>
