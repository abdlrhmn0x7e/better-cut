<script lang="ts">
	import { getFileThumbnail } from "$lib/utils/get-file-thumbnail";
	import { ImageIcon, VideoIcon, Volume2Icon } from "@lucide/svelte";
	import Badge from "../ui/badge/badge.svelte";

	interface FileCardProps {
		id: string;
		file: File;
	}

	const { id, file }: FileCardProps = $props();

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

<div class="relative" draggable="true" ondragstart={handleDragStart} role="application">
	{#await getFileThumbnail(file)}
		<p>Loading...</p>
	{:then thumbnail}
		<div class="size-24 mx-auto overflow-hidden rounded-lg bg-background">
			<img
				src={thumbnail}
				alt="file-thumbnail"
				class="size-full object-cover pointer-events-none"
			/>
		</div>
	{:catch}
		<p>Error Loading</p>
	{/await}

	<Badge class="absolute bottom-1 left-1/2 -translate-x-1/2 max-w-22" variant="outline">
		<p class="text-[0.5rem] truncate">{file.name}</p>
	</Badge>

	<Badge class="absolute top-1 right-1 size-6 p-0.5">
		{#if file.type.startsWith("video")}
			<VideoIcon />
		{:else if file.type.startsWith("image")}
			<ImageIcon />
		{:else if file.type.startsWith("audio")}
			<Volume2Icon />
		{/if}
	</Badge>
</div>
