<script lang="ts">
	import Container from "$lib/components/container.svelte";
	import CreateProjectDialog from "$lib/components/dialogs/create-project-dialog.svelte";
	import Logo from "$lib/components/logo.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Project } from "$lib/project/project.svelte";
	import { FilmIcon, InfoIcon, SettingsIcon } from "@lucide/svelte";

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

		<div class="col-span-3 space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="text-xl font-medium">Projects</h3>
				<CreateProjectDialog {refreshProjects} />
			</div>

			<div>
				{#await listPromise}
					<!-- promise is pending -->
					<p>waiting for the promise to resolve...</p>
				{:then list}
					<!-- promise was fulfilled or not a Promise -->
					<p>Available projects are {JSON.stringify(list)}</p>
				{:catch error}
					<!-- promise was rejected -->
					<p>Something went wrong: {error.message}</p>
				{/await}
			</div>
		</div>
	</main>
</Container>
