<script lang="ts">
	import Button from "../ui/button/button.svelte";
	import ImportFiles from "./import-files.svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
</script>

<div class="w-full sm:flex flex-wrap hidden px-3 p-1 border-b">
	<DropdownMenu.Root>
		<div class="flex gap-3 items-center">
			<p class="text-sm font-medium">Better <span class="text-blue-300">Cut</span></p>

			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						class="cursor-pointer data-[state=open]:bg-accent"
						size="xs">File</Button
					>
				{/snippet}
			</DropdownMenu.Trigger>
		</div>

		<DropdownMenu.Content align="start" class="min-w-48">
			<DropdownMenu.Item class="w-full h-7">
				{#snippet child({ props })}
					<ImportFiles {...props} />
				{/snippet}
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
