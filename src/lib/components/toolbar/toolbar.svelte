<script lang="ts">
	import Button from "../ui/button/button.svelte";
	import ImportVideo from "./import-video.svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
</script>

<div class="w-full sm:flex flex-wrap hidden px-2 py-1">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="sm">File</Button>
			{/snippet}
		</DropdownMenu.Trigger>

		<DropdownMenu.Content align="start">
			<DropdownMenu.Item class="w-full">
				{#snippet child({ props })}
					<ImportVideo {...props} />
				{/snippet}
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
