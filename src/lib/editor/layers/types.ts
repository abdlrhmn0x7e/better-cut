export type LayerType = "video" | "audio" | "image" | "composition";

export type BaseLayerOptions = {
	type: LayerType;
	projectId: string;
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
	type: "video";
	fileId: string;
	projectId: string;
	startOffset: number;
};
