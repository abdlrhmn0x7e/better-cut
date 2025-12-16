export interface ProjectData {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
	lastSavedAt: Date;
	fileIds: string[];
}

export interface ProjectOptions {
	id?: string;
	name?: string;
	fileIds?: string[];
	createdAt?: string | Date;
	updatedAt?: string | Date;
}

export interface SerializedProject extends Record<string, unknown> {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	lastSavedAt: string;
	fileIds: string[];
	compositionIds: string[];
}
