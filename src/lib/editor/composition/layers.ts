import type { VideoLayer, VideoLayerOptions } from "../layers/video";

export type LayerType = "video";

export type Layer = VideoLayer;

export type LayerOptions = {
	type: "video";
	options: VideoLayerOptions;
};
