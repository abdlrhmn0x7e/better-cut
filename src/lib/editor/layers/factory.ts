import type { LayerOptions } from "./types";
import { VideoLayer } from "./video";

export function createLayer(options: LayerOptions) {
	const { type, ...rest } = options;

	switch (type) {
		case "video":
			return VideoLayer.create(rest);
	}
}
