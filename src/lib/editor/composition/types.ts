import type { SerializedLayer } from "../layers/types";

export interface CompositionOptions {
	id?: string;
	fps?: number;
	name?: string;
	duration?: number;
	aspectRatio?: number;
}

export interface SerializedComposition {
	id: string;
	fps: number;
	name: string;
	duration: number;
	aspectRatio: number;
	layers: SerializedLayer[];
}
