import { FileManager, META_SUFFIX } from "./file-manager.svelte";

let instance: FileManager | null = null;

export async function getFileManager() {
	if (!instance) instance = await FileManager.init();
	return instance;
}

export * from "./types";
export * from "./media-source";
export * from "./audio-scheduler";
export { FileManager, META_SUFFIX };
