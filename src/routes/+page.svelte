<script lang="ts">
	import Container from "$lib/components/container.svelte";
	import CreateProjectDialog from "$lib/components/dialogs/create-project-dialog.svelte";
	import Logo from "$lib/components/logo.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Project } from "$lib/project/project.svelte";
	import { FilmIcon, InfoIcon, SettingsIcon } from "@lucide/svelte";
	import * as Empty from "$lib/components/ui/empty/index.js";
	import { Spinner } from "$lib/components/ui/spinner/index.js";
	import ProjectCard from "$lib/components/project-card.svelte";

	let listPromise = $state(Project.list());
	function refreshProjects() {
		listPromise = Project.list();
	}
</script>

<Container class="max-w-7xl">
	<header
		class="mx-auto hidden h-24 w-full items-center justify-between gap-x-6 border-b p-6 sm:flex"
	>
		<Logo />
		<Badge variant="secondary">
			<InfoIcon />
			<p class="text-sm">This is an alpha version</p>
		</Badge>
	</header>

	<main class="grid grid-cols-4 gap-12 py-4 px-2">
		<aside class="flex flex-col gap-1">
			<Button variant="ghost" size="lg" class="justify-start bg-accent/50">
				<FilmIcon />
				Projects
			</Button>
			<Button variant="ghost" size="lg" class="justify-start" disabled>
				<SettingsIcon /> Settings
			</Button>
		</aside>

		<div class="col-span-3 space-y-6">
			<div class="flex items-center justify-between">
				<h3 class="text-xl font-medium">Projects</h3>
				<CreateProjectDialog {refreshProjects} />
			</div>

			<div>
				{#await listPromise}
					<Empty.Root class="w-full">
						<Empty.Header>
							<Empty.Media variant="icon">
								<Spinner />
							</Empty.Media>
							<Empty.Title>Retrieving projects</Empty.Title>
							<Empty.Description>
								Please wait while we retrieve your projects. Do not refresh the page.
							</Empty.Description>
						</Empty.Header>
					</Empty.Root>
				{:then list}
					<div class="grid grid-cols-2 gap-3">
						{#each list as project (project.id)}
							<ProjectCard {project} />
						{/each}
					</div>
				{:catch error}
					<p>Something went wrong: {error.message}</p>
				{/await}
			</div>
		</div>
	</main>
</Container>
