<script lang="ts">
	import { ImageIcon, VideoIcon, Volume2Icon } from "@lucide/svelte";
	import Badge from "../ui/badge/badge.svelte";
	import type { FileMeta } from "$lib/media";

	const { id, name, thumbnail, mimeType }: FileMeta = $props();

	function handleDragStart(
		e: DragEvent & {
			currentTarget: EventTarget & HTMLDivElement;
		}
	) {
		const dataTransfer = e.dataTransfer;
		if (!dataTransfer) return;
		dataTransfer.items.add(id, "text/plain");
		dataTransfer.effectAllowed = "move";
	}
</script>

<div
	class="relative cursor-grab active:crusor-grabbing"
	draggable="true"
	ondragstart={handleDragStart}
	role="application"
>
	<div class="size-24 mx-auto overflow-hidden rounded-lg bg-background">
		<img src={thumbnail} alt="file-thumbnail" class="size-full object-cover pointer-events-none" />
	</div>

	<Badge class="absolute bottom-1 left-1/2 -translate-x-1/2 max-w-22" variant="outline">
		<p class="text-[0.5rem] truncate">{name}</p>
	</Badge>

	<Badge class="absolute top-1 right-1 size-6 p-0.5">
		{#if mimeType.startsWith("video")}
			<VideoIcon />
		{:else if mimeType.startsWith("image")}
			<ImageIcon />
		{:else if mimeType.startsWith("audio")}
			<Volume2Icon />
		{/if}
	</Badge>
</div>
