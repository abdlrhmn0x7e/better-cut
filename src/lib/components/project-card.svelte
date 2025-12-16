<script lang="ts">
	import type { SerializedProject } from "$lib/project";
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "./ui/badge";
	import { CalendarIcon } from "@lucide/svelte";
	import { resolve } from "$app/paths";

	const { project }: { project: SerializedProject } = $props();
</script>

<a href={resolve(`/${project.id}`)}>
	<Card.Root class="hover:border-primary transition-all">
		<Card.Header>
			<Card.Title class="text-xl capitalize">{project.name}</Card.Title>
		</Card.Header>
		<Card.Content class="grid grid-cols-2">
			<p class="font-medium">
				<span class="text-muted-foreground">{project.compositionIds.length}</span> -
				<span class="font-medium">Compositions</span>
			</p>
			<p class="font-medium">
				<span class="text-muted-foreground">{project.fileIds.length}</span> -
				<span class="font-medium">Files</span>
			</p>
		</Card.Content>
		<Card.Footer class="flex-wrap gap-3">
			<Badge variant="outline">
				<CalendarIcon />
				<span>Created At {new Date(project.createdAt).toDateString()}</span>
			</Badge>

			<Badge variant="destructive">
				<CalendarIcon />
				<span>Last Saved At {new Date(project.lastSavedAt).toDateString()}</span>
			</Badge>
		</Card.Footer>
	</Card.Root>
</a>
