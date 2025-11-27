<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";
	import Button from "./ui/button/button.svelte";
	import { PauseIcon, PlayIcon } from "@lucide/svelte";
	import type { Action } from "svelte/action";
	import { getEditorState } from "$lib/editor/context.svelte";

	let {
		action,
		class: classNames,
		...props
	}: { action: Action<HTMLDivElement> } & HTMLAttributes<HTMLDivElement> = $props();

	const ctx = getEditorState();

	function handlePlay() {
		if (!ctx.comp) throw new Error("No initialized composition");
		ctx.comp.render();
	}

	function handlePause() {
		if (!ctx.comp) throw new Error("No initialized composition");
	}
</script>

<div class={cn("relative size-full", classNames)} {...props}>
	<div
		use:action
		class="flex-1 size-full flex items-center justify-center [&_.konvajs-content]:bg-muted"
	></div>

	<div class="shrink-0 border rounded-lg p-2 bg-card absolute bottom-4 inset-x-4">
		<Button onclick={handlePlay}>
			<PlayIcon />
			Play
		</Button>

		<Button onclick={handlePause}>
			<PauseIcon />
			Pause
		</Button>
	</div>
</div>
