<script lang="ts">
	import { getFileThumbnail } from "$lib/utils/get-file-thumbnail";
	import * as Table from "../ui/table";

	interface FileCardProps {
		file: File;
	}

	const { file }: FileCardProps = $props();
	getFileThumbnail(file).then((file) => console.log(file));
</script>

<Table.Row>
	<Table.Cell class="flex gap-2">
		{#await getFileThumbnail(file)}
			<p>Loading...</p>
		{:then thumbnail}
			<div class="size-6 overflow-hidden rounded-lg">
				<img src={thumbnail} alt="file-thumbnail" class="size-full object-cover" />
			</div>
		{:catch}
			<p>Error Loading</p>
		{/await}

		<p class="truncate max-w-48">{file.name}</p>
	</Table.Cell>

	<Table.Cell>{file.type}</Table.Cell>
</Table.Row>
