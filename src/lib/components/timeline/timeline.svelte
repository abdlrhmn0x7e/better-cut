<script lang="ts">
	import { getEditorState } from "$lib/editor/context.svelte";

	const ctx = getEditorState();

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
						options: {
							src: file,
							order: 1
						},
						type: "video"
					});
				});
			}
		}
	}
</script>

<div
	class="size-full"
	ondrop={handleDrop}
	ondragover={(e) => e.preventDefault()}
	role="application"
>
	<p>time line</p>
</div>
