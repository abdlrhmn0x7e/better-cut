<script lang="ts">
	import * as Resizable from "$lib/components/ui/resizable/index.js";
</script>

<main class="h-screen flex flex-col">
	<div class="h-9 bg-muted"></div>

	<Resizable.PaneGroup direction="vertical" class="rounded-lg border">
		<Resizable.Pane defaultSize={50}>
			<Resizable.PaneGroup direction="horizontal">
				<Resizable.Pane defaultSize={45}>
					<div class="flex h-full items-center justify-center p-6">
						<span class="font-semibold">Two</span>
					</div>
				</Resizable.Pane>
				<Resizable.Handle />
				<Resizable.Pane defaultSize={55}>
					<div class="flex h-full items-center justify-center p-6">
						<span class="font-semibold">Three</span>
					</div>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</Resizable.Pane>

		<Resizable.Handle />

		<Resizable.Pane defaultSize={50}>
			<div class="flex items-center justify-center p-6">
				<span class="font-semibold">One</span>
			</div>
		</Resizable.Pane>
	</Resizable.PaneGroup>
</main>
