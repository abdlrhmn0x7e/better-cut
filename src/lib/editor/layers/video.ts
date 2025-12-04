import { CanvasSink, type WrappedCanvas } from "mediabunny";
import { probeVideo, type VideoProbe } from "../media/mediabunny.ts";
import { BaseLayer, type BaseLayerOptions } from "./base.ts";
import Konva from "konva";
import type { IFrame } from "konva/lib/types";

type VideoLayerOptions = Omit<BaseLayerOptions, "type">;

export class VideoLayer extends BaseLayer {
	private _videoPrope: VideoProbe | null = null;
	private _videoFrameIterator: AsyncGenerator<WrappedCanvas, void, unknown> | null = null;
	private _videoSink: CanvasSink | null = null;
	private _nextFrame: WrappedCanvas | null = null;
	private _asyncId: number = 0;

	public konvaLayer: Konva.Layer | null = null;
	private _konvaAnimation: Konva.Animation | null = null;

	private _canvas: HTMLCanvasElement | null = null;
	private _canvasCtx: CanvasRenderingContext2D | null = null;

	public isReady: boolean = false;

	private constructor({ ...base }: VideoLayerOptions) {
		super({ ...base, type: "video" });
	}

	private async _init() {
		this._videoPrope = await probeVideo(this.src);
		this._videoSink = new CanvasSink(this._videoPrope.video);
		this._videoFrameIterator = this._videoSink.canvases();

		const firstFrame = (await this._videoFrameIterator.next()).value ?? null;
		this._nextFrame = (await this._videoFrameIterator.next()).value ?? null;

		if (!firstFrame) throw new Error("UNEXPECTED: This video has no frames");

		this._canvas = document.createElement("canvas");
		this._canvas.width = this._videoPrope.dims.width;
		this._canvas.height = this._videoPrope.dims.height;
		this._canvasCtx = this._canvas.getContext("2d");

		const imageNode = new Konva.Image({
			image: this._canvas,
			width: this._videoPrope.dims.width,
			height: this._videoPrope.dims.height,
			draggable: true
		});
		imageNode.width(this._videoPrope.dims.width);
		imageNode.height(this._videoPrope.dims.height);

		this.konvaLayer = new Konva.Layer();
		const trans = new Konva.Transformer({
			nodes: [imageNode],
			keepRatio: true,
			enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"]
		});
		this.konvaLayer.add(imageNode, trans);

		this._konvaAnimation = new Konva.Animation(this._tick.bind(this), this.konvaLayer);

		this._asyncId++;
		this.isReady = true;
		this.duration = this._videoPrope.duration;
	}

	static async init(options: VideoLayerOptions) {
		const layer = new VideoLayer(options);
		await layer._init();

		return layer;
	}

	private _tick(frame: IFrame) {
		if (!this.isReady || !this._videoFrameIterator || !this._nextFrame || !this.konvaLayer) return;
		if (!this._canvas) throw new Error("unexpected");
		if (!this._canvasCtx) throw new Error("Your browser doesn't support 2d canvas context");

		this._canvasCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);
		this._canvasCtx.drawImage(this._nextFrame.canvas, 0, 0);

		this._nextFrame = null; // clean up
		void this._updateNextFrame();
	}

	private async _updateNextFrame() {
		const nextFrame = (await this._videoFrameIterator?.next())?.value ?? null;

		if (!nextFrame) return;

		console.log("next frame", nextFrame.timestamp);

		this._nextFrame = nextFrame;
	}

	play() {
		if (!this._konvaAnimation) return;

		this._konvaAnimation.start();
	}

	stop() {
		if (!this._konvaAnimation || !this._videoFrameIterator) return;

		this._konvaAnimation.stop();
		this._videoFrameIterator.return();
	}
}
