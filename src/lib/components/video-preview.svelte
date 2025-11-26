<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";
	import Button from "./ui/button/button.svelte";
	import { getCompisitionState } from "$lib/editor/composition/composition.svelte";
	import { PlayIcon } from "@lucide/svelte";
	import type { Action } from "svelte/action";

	let {
		action,
		class: classNames,
		...props
	}: { action: Action<HTMLDivElement> } & HTMLAttributes<HTMLDivElement> = $props();

	const ctx = getCompisitionState();

	function handlePlay() {
		if (!ctx.comp) throw new Error("No initialized composition");
		ctx.comp.render();
	}
</script>

<div class={cn("flex flex-col gap-2 size-full items-center", classNames)} {...props}>
	<div use:action class="flex-1 size-fit"></div>

	<div class="p-4 flex items-center justify-center">
		<Button onclick={handlePlay}>
			<PlayIcon />
			Play
		</Button>
	</div>
</div>
