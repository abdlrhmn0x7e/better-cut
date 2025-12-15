<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";

	const { class: classes, children }: { class?: string; children: Snippet } = $props();
</script>

<div class={cn("container mx-auto px-4 lg:px-8 xl:px-12", classes)}>
	{@render children()}
</div>
