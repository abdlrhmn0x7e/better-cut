<script lang="ts">
	import "@fontsource-variable/instrument-sans";
	import "./layout.css";

	import { Toaster } from "$lib/components/ui/sonner/index.js";

	import { ModeWatcher } from "mode-watcher";
	import favicon from "$lib/assets/favicon.svg";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Toaster />

<ModeWatcher />
{@render children()}
