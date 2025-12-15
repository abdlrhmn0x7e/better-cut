<script lang="ts" module>
	import { z } from "zod/v4";
	import { toast } from "svelte-sonner";

	const formSchema = z.object({
		name: z.string().min(2, "Must be at least 2 characters long").max(50)
	});
</script>

<script lang="ts">
	import { defaults, superForm } from "sveltekit-superforms";
	import { zod4 } from "sveltekit-superforms/adapters";
	import * as Form from "$lib/components/ui/form/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Project } from "$lib/project";
	import { Button } from "../ui/button";

	const { onSuccess }: { onSuccess: () => void } = $props();

	const form = superForm(defaults(zod4(formSchema)), {
		validators: zod4(formSchema),
		SPA: true,
		onUpdate: async ({ form: f }) => {
			if (f.valid) {
				try {
					await Project.init({ name: f.data.name });
					onSuccess();
				} catch {
					toast.error("Failed to create project. Please try again.");
					return;
				}
			}
		}
	});

	const { form: formData, enhance, delayed } = form;
</script>

<form method="POST" class="space-y-6" id="project-form" use:enhance>
	<Form.Field {form} name="name">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Project name</Form.Label>
				<Input {...props} bind:value={$formData.name} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<div class="flex justify-end">
		<Button type="submit" form="project-form" disabled={$delayed}>Create</Button>
	</div>
</form>
