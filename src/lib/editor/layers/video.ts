import { createId } from "@paralleldrive/cuid2";
import type { BaseLayer } from ".";
import Konva from "konva";

interface VideoSource {
	src: string;
	element: HTMLVideoElement;

	width: number;
	height: number;

	duration: number;
}

export interface VideoLayer extends BaseLayer {
	readonly type: "video";

	konvaLayer: Konva.Layer;

	volume: number;
	muted: boolean; // keep the volume state if the user unmutes the VideoLayer.

	play: () => void;
	pause: () => void;

	source: VideoSource;
}

export async function loadVideo(file: File) {
	const videoElement = document.createElement("video");
	videoElement.src = URL.createObjectURL(file);

	await new Promise((res, rej) => {
		videoElement.onloadedmetadata = () => res(null);
		videoElement.onerror = () => rej();
	});

	return {
		src: "",
		element: videoElement,

		width: videoElement.videoWidth,
		height: videoElement.videoHeight,

		duration: videoElement.duration
	} satisfies VideoSource;
}

export type VideoLayerOptions = {
	src: File;
	order: number;
};

export async function createVideoLayer({ src, order }: VideoLayerOptions) {
	if (order <= 0) throw new Error("A Layer's order must be positive");

	const source = await loadVideo(src);

	const video = new Konva.Image({
		image: source.element
	});
	video.width(source.width);
	video.height(source.height);

	const layer = new Konva.Layer();
	layer.add(video);

	const anim = new Konva.Animation(() => {}, layer);

	const play = () => {
		source.element.play();
		anim.start();
	};

	const pause = () => {
		source.element.pause();
		anim.stop();
	};

	return {
		id: createId(),
		type: "video",

		konvaLayer: layer,
		order: 1,
		play,
		pause,

		source,

		startTime: 0,
		duration: source.duration,

		muted: false,
		volume: 100
	} satisfies VideoLayer;
}
