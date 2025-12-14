import type { SerializedComposition } from "$lib/editor/composition";

export interface ProjectData {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
	lastSavedAt: Date;
	fileIds: string[];
}

export interface ProjectOptions {
	name?: string;
	fileIds?: string[];
}

export interface SerializedProject extends Record<string, unknown> {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	fileIds: string[];
	compositions: SerializedComposition[];
}
