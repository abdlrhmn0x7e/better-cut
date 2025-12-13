<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";
	import Button from "./ui/button/button.svelte";
	import { PauseIcon, PlayIcon } from "@lucide/svelte";
	import type { Action } from "svelte/action";
	import { getEditorState } from "$lib/editor/editor-state.svelte";

	let {
		action,
		class: classNames,
		...props
	}: { action: Action<HTMLCanvasElement> } & HTMLAttributes<HTMLDivElement> = $props();

	const ctx = getEditorState();

	function handlePlay() {
		void ctx.comp.play();
	}

	function handlePause() {
		void ctx.comp.pause();
	}

	function handleToggle() {
		if (ctx.comp.playing) void ctx.comp.pause();
		else void ctx.comp.play();
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
		<div class="size-full flex-1 flex items-center justify-center">
			<canvas use:action class="border bg-background"></canvas>
		</div>
	</div>

	<div class="shrink-0 flex justify-end flex-wrap gap-2">
		<Button onclick={handlePlay} disabled={ctx.comp.playing} variant="ghost" size="icon-sm">
			<PlayIcon />
		</Button>

		<Button onclick={handlePause} disabled={!ctx.comp.playing} variant="ghost" size="icon-sm">
			<PauseIcon />
		</Button>
	</div>
</div>
