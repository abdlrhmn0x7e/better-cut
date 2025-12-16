<script lang="ts">
	import { getEditorState } from "$lib/editor";
	import { FilePlusIcon } from "@lucide/svelte";
	import type { WithElementRef } from "bits-ui";
	import { onMount } from "svelte";
	import type { HTMLButtonAttributes, MouseEventHandler } from "svelte/elements";

	type ImportFilesProps = WithElementRef<HTMLButtonAttributes>;
	const { onclick: dropdownCb, ...props }: ImportFilesProps = $props();

	let videoInput: HTMLInputElement;
	const editor = getEditorState();

	const handleFilesInput = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const files = target.files;

		if (!files || files.length === 0) return;
		if (editor.status !== "ready") return;

		// add files to a global state
		void Promise.all(Array.from(files).map((file) => editor.addFile(file)));
	};

	const handleImport: MouseEventHandler<HTMLButtonElement> = (e) => {
		videoInput.click();
		dropdownCb?.(e);
	};

	onMount(() => {
		videoInput.addEventListener("change", handleFilesInput);
	});
</script>

<input bind:this={videoInput} type="file" accept="video/mp4" multiple hidden />

<button onclick={handleImport} {...props}>
	<FilePlusIcon />
	Import Files
</button>
