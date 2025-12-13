import { FileManager } from "$lib/media/file-manager.svelte";

export class Project {
	public fileManager: FileManager | null = null;

	private constructor() {}

	public static async init() {
		const project = new Project();
		await project._init();
		return project;
	}

	private async _init() {
		this.fileManager = await FileManager.init();
	}

	addFile() {}
	removeFile() {}
	createComposition() {}
	save() {}
	load() {}
}
