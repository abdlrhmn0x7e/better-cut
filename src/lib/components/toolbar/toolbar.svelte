<script lang="ts">
	import Button from "../ui/button/button.svelte";
	import ImportFiles from "./import-files.svelte";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import Logo from "../logo.svelte";
	import { getEditorState } from "$lib/editor";

	const editor = getEditorState();
</script>

<div class="w-full sm:flex flex-wrap hidden px-3 p-1 border-b h-10 shrink-0">
	<DropdownMenu.Root>
		<div class="flex gap-3 items-center">
			<Logo class="text-sm" />

			<div class="flex gap-1 items-center">
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="xs"
							class="cursor-pointer data-[state=open]:bg-accent"
						>
							File
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>

				<Button onclick={() => editor.save()} size="xs" variant="ghost" disabled={editor.isSaving}
					>Save</Button
				>

				<Button onclick={() => editor.history.undo()} size="xs" variant="ghost">Undo</Button>
				<Button onclick={() => editor.history.redo()} size="xs" variant="ghost">redo</Button>
			</div>
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
