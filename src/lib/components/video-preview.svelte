<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";
	import Button from "./ui/button/button.svelte";
	import { PauseIcon, PlayIcon } from "@lucide/svelte";
	import type { Action } from "svelte/action";
	import { getEditorState } from "$lib/editor/context.svelte";

	import { Card, CardContent, CardFooter } from "$lib/components/ui/card";

	let {
		action,
		class: classNames,
		...props
	}: { action: Action<HTMLCanvasElement> } & HTMLAttributes<HTMLDivElement> = $props();

	const ctx = getEditorState();

	function handlePlay() {
		if (!ctx.comp) throw new Error("No initialized composition");
		void ctx.comp.play();
	}

	function handlePause() {
		if (!ctx.comp) throw new Error("No initialized composition");
		void ctx.comp.pause();
	}
</script>

<Card class={cn("size-full flex flex-col gap-2 p-2", classNames)} {...props}>
	<CardContent class="flex-1 size-full overflow-hidden">
		<div class="size-full flex-1 flex items-center justify-center">
			<canvas use:action class="border bg-background"></canvas>
		</div>
	</CardContent>

	<CardFooter class="shrink-0 justify-end flex-wrap gap-2">
		<Button onclick={handlePlay} variant="ghost" size="icon-sm">
			<PlayIcon />
		</Button>

		<Button onclick={handlePause} variant="ghost" size="icon-sm">
			<PauseIcon />
		</Button>
	</CardFooter>
</Card>
