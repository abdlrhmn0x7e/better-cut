<script lang="ts">
	import { getEditorState } from "$lib/editor/context.svelte";
	import { FilePlusIcon } from "@lucide/svelte";
	import type { WithElementRef } from "bits-ui";
	import { onMount } from "svelte";
	import type { HTMLButtonAttributes, MouseEventHandler } from "svelte/elements";

	type ImportVideoProps = WithElementRef<HTMLButtonAttributes>;
	const { onclick: dropdownCb, ...props }: ImportVideoProps = $props();

	let videoInput: HTMLInputElement;

	const ctx = getEditorState();

	const handleVideoInput = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const files = target.files;
		if (!files || files?.length === 0) throw new Error("You must provide 1 file atleast");

		// add files to a global state

		// Why doesn't this work?
		// ctx.files = [...ctx.files, ...Array.from(files)];
		// ctx.files.concat(Array.from(files));

		Array.from(files).forEach((file) => ctx.files.push(file));
	};

	const handleImport: MouseEventHandler<HTMLButtonElement> = (e) => {
		videoInput.click();
		dropdownCb?.(e);
	};

	onMount(() => {
		videoInput.addEventListener("change", handleVideoInput);
	});
</script>

<input bind:this={videoInput} type="file" accept="video/*, audio/*, image/*" multiple hidden />

<button onclick={handleImport} {...props}>
	<FilePlusIcon />
	Import Files
</button>
