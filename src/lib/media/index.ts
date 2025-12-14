import { FileManager } from "./file-manager.svelte";

export type { FileMeta } from "./types";

let instance: FileManager | null = null;

export async function getFileManager() {
	if (!instance) instance = await FileManager.init();
	return instance;
}

export * from "./file-manager.svelte";
