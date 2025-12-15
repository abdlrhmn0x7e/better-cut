<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import { PlusIcon } from "@lucide/svelte";
	import { Button } from "../ui/button";
	import CreateProjectForm from "../forms/create-project-form.svelte";

	let open = $state(false);
	const { refreshProjects }: { refreshProjects: () => void } = $props();

	function onSuccess() {
		refreshProjects();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props} class="cursor-pointer">
				<PlusIcon /> Create a new projects
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create a new project</Dialog.Title>
			<Dialog.Description>Enter the details for your new project below.</Dialog.Description>
		</Dialog.Header>
		<CreateProjectForm {onSuccess} />
	</Dialog.Content>
</Dialog.Root>
