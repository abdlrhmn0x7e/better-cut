import type { VideoLayer, VideoLayerOptions } from "../layers/video";

export type LayerType = "video";

export type Layer = VideoLayer;

export type LayerOptions = {
	type: "video";

	// TODO: add the ability for the user to decide the order later on
	options: { src: VideoLayerOptions["src"] };
};
