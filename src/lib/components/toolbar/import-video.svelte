<script lang="ts">
	import { getCompisitionState } from "$lib/editor/composition/composition.svelte";
	import { FilePlusIcon } from "@lucide/svelte";
	import type { WithElementRef } from "bits-ui";
	import { onMount } from "svelte";
	import type { HTMLButtonAttributes, MouseEventHandler } from "svelte/elements";

	type ImportVideoProps = WithElementRef<HTMLButtonAttributes>;
	const { onclick: dropdownCb, ...props }: ImportVideoProps = $props();

	let videoInput: HTMLInputElement;

	const ctx = getCompisitionState();

	const handleVideoInput = (e: Event) => {
		if (!ctx.comp) throw new Error("There's no initialized comp");

		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) throw new Error("You must provide 1 file atleast");

		ctx.comp.addLayer({
			type: "video",
			options: {
				order: 1,
				src: file
			}
		});
	};

	const handleImport: MouseEventHandler<HTMLButtonElement> = (e) => {
		videoInput.click();
		dropdownCb?.(e);
	};

	onMount(() => {
		videoInput.addEventListener("change", handleVideoInput);
	});
</script>

<input bind:this={videoInput} type="file" accept="video/*" hidden />

<button onclick={handleImport} {...props}>
	<FilePlusIcon />
	Import Files
</button>
