<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";
	import Button from "./ui/button/button.svelte";
	import { ExpandIcon, PauseIcon, PlayIcon } from "@lucide/svelte";
	import type { Action } from "svelte/action";
	import { getEditorState } from "$lib/editor/context.svelte";

	import { Card, CardContent, CardFooter } from "$lib/components/ui/card";

	let {
		action,
		class: classNames,
		...props
	}: { action: Action<HTMLDivElement> } & HTMLAttributes<HTMLDivElement> = $props();

	const ctx = getEditorState();

	function handlePlay() {
		if (!ctx.comp) throw new Error("No initialized composition");
		ctx.comp.play();
	}

	function handlePause() {
		if (!ctx.comp) throw new Error("No initialized composition");
		ctx.comp.pause();
	}
</script>

<Card class={cn("size-full flex flex-col gap-3 p-2", classNames)} {...props}>
	<CardContent class="flex-1 pt-4">
		<div
			use:action
			class="size-full flex-1 flex items-center justify-center [&_.konvajs-content]:bg-background [&_.konvajs-content]:border"
		></div>
	</CardContent>

	<CardFooter class="justify-end">
		<div class="shrink-0 flex flex-wrap gap-2 justify-end">
			<Button onclick={handlePlay} variant="ghost" size="icon-sm">
				<PlayIcon />
			</Button>

			<Button onclick={handlePause} variant="ghost" size="icon-sm">
				<PauseIcon />
			</Button>
		</div>
	</CardFooter>
</Card>
