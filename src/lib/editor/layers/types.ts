export type LayerType = "video" | "audio" | "image";

export type BaseLayerOptions = {
	type: LayerType;
	startOffset: number;
};

export type TimeOptions = { anchor: number; time: number };
export type VideoLayerOptions = Omit<BaseLayerOptions, "type"> & {
	fileId: string;
	targetFps: number;
	startOffset: number;
	audioCtx: AudioContext;
};

// TODO: Add other layer options
export type LayerOptions = VideoLayerOptions & {
	type: "video";
};

// TODO: Add other layer options
export type SerializedLayer = {
	type: "video";
	fileId: string;
	startOffset: number;
};
