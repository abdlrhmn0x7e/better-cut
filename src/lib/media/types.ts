type MediaType = "video" | "audio" | "image";

export type FileMeta = {
	id: string; // uuid
	name: string;
	mimeType: string;
	size: number;
	duration?: number;
	thumbnail?: string;
};
