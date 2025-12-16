<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";
	import Button from "./ui/button/button.svelte";
	import { PauseIcon, PlayIcon } from "@lucide/svelte";
	import { getEditorState } from "$lib/editor/editor-state.svelte";

	let { class: classNames, ...props }: HTMLAttributes<HTMLDivElement> = $props();

	const editor = getEditorState();

	function handlePlay() {
		void editor.activeComposition?.start();
	}

	function handlePause() {
		void editor.activeComposition?.stop();
	}

	function handleToggle() {
		if (editor.activeComposition?.playing) void editor.activeComposition.stop();
		else void editor.activeComposition?.start();
	}

	function handleKeydown(
		e: KeyboardEvent & {
			currentTarget: EventTarget & Window;
		}
	) {
		const key = e.key;
		switch (key) {
			case " ": {
				handleToggle();
				break;
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class={cn("bg-card size-full flex flex-col gap-2 p-2 border-x", classNames)} {...props}>
	<div class="flex-1 size-full overflow-hidden py-2">
		{#if editor.activeComposition}
			<div class="size-full flex-1 flex items-center justify-center">
				<canvas bind:this={editor.activeComposition.canvas} class="border bg-background"></canvas>
			</div>
		{/if}
	</div>

	<div class="shrink-0 flex justify-end flex-wrap gap-2">
		<Button
			onclick={handlePlay}
			disabled={editor.activeComposition?.playing}
			variant="ghost"
			size="icon-sm"
		>
			<PlayIcon />
		</Button>

		<Button
			onclick={handlePause}
			disabled={!editor.activeComposition?.playing}
			variant="ghost"
			size="icon-sm"
		>
			<PauseIcon />
		</Button>
	</div>
</div>
