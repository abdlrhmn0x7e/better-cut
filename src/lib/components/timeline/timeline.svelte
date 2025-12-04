<script lang="ts">
	import { getEditorState } from "$lib/editor/context.svelte";

	const ctx = getEditorState();
	const layers = $derived(ctx.comp?.layers ?? []);

	function handleDrop(
		e: DragEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		const items = e.dataTransfer?.items;
		if (!items) return;

		for (const item of items) {
			if (item.kind === "string") {
				item.getAsString((id) => {
					const file = ctx.files.get(id);
					if (!file) return;

					ctx.comp?.addLayer({
						src: file,
						type: "video"
					});
				});
			}
		}
	}
</script>

<div
	class="size-full overflow-auto p-2 divide-y"
	ondrop={handleDrop}
	ondragover={(e) => e.preventDefault()}
	role="application"
>
	{#each layers as layer (layer.id)}
		<div class="bg-muted px-2 py-1 min-w-32">
			{layer.type}
		</div>
	{/each}
</div>
