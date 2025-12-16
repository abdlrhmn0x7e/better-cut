<script lang="ts">
	import { resolve } from "$app/paths";
	import { cn } from "$lib/utils";

	const { class: classes }: { class?: string } = $props();
</script>

<a href={resolve("/")}>
	<h1 class={cn("text-2xl font-medium", classes)}>Better<span class="text-primary">Cut</span></h1>
</a>
