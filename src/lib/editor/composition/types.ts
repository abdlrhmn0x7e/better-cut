import type { SerializedLayer } from "../layers/types";

export interface CompositionOptions {
	id?: string;
	fps?: number;
	name?: string;
	duration?: number;
	projectId: string;
	aspectRatio?: number;
}

export interface SerializedComposition extends Record<string, unknown> {
	id: string;
	fps: number;
	name: string;
	duration: number;
	projectId: string;
	aspectRatio: number;
	layers: SerializedLayer[];
}
