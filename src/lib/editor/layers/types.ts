import type { BaseLayer } from "./base.svelte";

export type LayerType = "video" | "audio" | "image" | "composition";

export interface Drawable extends BaseLayer {
	getFrame(timestamp: number): Promise<HTMLCanvasElement | OffscreenCanvas | null>;
}

export interface Playable extends BaseLayer {
	onPlay(timestamp: number): Promise<void>;
	onPause(): Promise<void>;
}

export type BaseLayerOptions = {
	type: LayerType;
	projectId: string;

	zIndex: number;
	startOffset: number;
};

export type TimeOptions = { anchor: number; time: number };
export type VideoLayerOptions = Omit<BaseLayerOptions, "type"> & {
	fileId: string;
};

// TODO: Add other layer options
export type LayerOptions = VideoLayerOptions & {
	type: "video";
};

// TODO: Add other layer options
export type SerializedLayer = {
	id: string;
	type: "video";
	fileId: string;
	projectId: string;

	zIndex: number;
	startTime: number;
	startOffset: number;
	endTime: number | null;
};
