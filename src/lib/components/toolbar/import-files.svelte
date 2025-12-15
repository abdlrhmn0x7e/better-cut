<script lang="ts">
	import { FilePlusIcon } from "@lucide/svelte";
	import type { WithElementRef } from "bits-ui";
	import { onMount } from "svelte";
	import type { HTMLButtonAttributes, MouseEventHandler } from "svelte/elements";

	type ImportVideoProps = WithElementRef<HTMLButtonAttributes>;
	const { onclick: dropdownCb, ...props }: ImportVideoProps = $props();

	let videoInput: HTMLInputElement;

	// const handleVideoInput = async (e: Event) => {
	// 	const target = e.target as HTMLInputElement;
	// 	const files = target.files;
	// 	if (!files || files?.length === 0) throw new Error("You must provide 1 file atleast");

	// 	// add files to a global state
	// 	Array.from(files).forEach((file) => ctx.files.set(crypto.randomUUID(), file));
	// };

	const handleImport: MouseEventHandler<HTMLButtonElement> = (e) => {
		videoInput.click();
		dropdownCb?.(e);
	};

	// onMount(() => {
	// 	videoInput.addEventListener("change", handleVideoInput);
	// });
</script>

<input bind:this={videoInput} type="file" accept="video/mp4" multiple hidden />

<button onclick={handleImport} {...props}>
	<FilePlusIcon />
	Import Files
</button>
