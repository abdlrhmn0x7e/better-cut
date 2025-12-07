import { AudioBufferSink, CanvasSink, type WrappedCanvas } from "mediabunny";
import { probeVideo, type VideoProbe } from "../media/mediabunny.ts";
import { BaseLayer, type BaseLayerOptions } from "./base.ts";
import { assert } from "$lib/utils/misc";

type VideoLayerOptions = Omit<BaseLayerOptions, "type"> & {
	scale: number;
	targetFps: number;
	canvas: HTMLCanvasElement;
};

export class VideoLayer extends BaseLayer {
	public scale: number;
	private _isPlaying = false;
	private _videoPrope: VideoProbe | null = null;
	private _videoFrameIterator: AsyncGenerator<WrappedCanvas, void, unknown> | null = null;
	private _videoSink: CanvasSink | null = null;

	private _nextFrame: WrappedCanvas | null = null;
	private _lastAlignedTimestamp = -1;

	public targetFps: number;
	private _frameDuration: number;

	private _audioCtx: AudioContext | null = null;
	private _audioSink: AudioBufferSink | null = null;

	private canvas: HTMLCanvasElement | null = null;
	private canvasCtx: CanvasRenderingContext2D | null = null;

	public isReady = false;

	private constructor({ targetFps, canvas, scale, ...base }: VideoLayerOptions) {
		super({ ...base, type: "video" });
		this.targetFps = targetFps;
		this._frameDuration = 1000 / targetFps;

		this.canvas = canvas;
		this.canvasCtx = this.canvas.getContext("2d");
		this.scale = scale;
	}

	private async _init() {
		this._videoPrope = await probeVideo(this.src);
		this._videoSink = new CanvasSink(this._videoPrope.video);
		this._videoFrameIterator = await this._createVideoFrameIterator();

		const firstFrame = (await this._videoFrameIterator.next()).value ?? null;
		this._nextFrame = (await this._videoFrameIterator.next()).value ?? null;

		if (!firstFrame) throw new Error("UNEXPECTED: This video has no frames");

		// We must create the audio context with the matching sample rate for correct acoustic results
		// (especially for low-sample rate files)
		this._audioCtx = new AudioContext({ sampleRate: this._videoPrope.audio?.sampleRate });
		if (this._videoPrope.audio) this._audioSink = new AudioBufferSink(this._videoPrope.audio);

		this.isReady = true;
		this.duration = this._videoPrope.duration;
	}

	private async _createVideoFrameIterator(startTime = 0) {
		if (!this._videoSink) throw new Error("a video sink must be initialized first");
		if (this._videoFrameIterator) await this._videoFrameIterator.return();

		return this._videoSink.canvases(startTime);
	}

	static async init(options: VideoLayerOptions) {
		const layer = new VideoLayer(options);
		await layer._init();

		return layer;
	}

	private _render() {
		requestAnimationFrame((timestamp) => {
			this._tick.bind(this)({
				// offset the anchor by the first frame timestamp
				// (multiplied by a 1000 to convert it to ms since the timestamp is in seconds)
				anchor: timestamp - (this._nextFrame?.timestamp ?? 0) * 1000,
				timestamp: timestamp,
				prevTimestamp: timestamp
			});
		});
	}

	private _tick({
		timestamp,
		anchor,
		prevTimestamp
	}: {
		timestamp: number;
		anchor: number;
		prevTimestamp: number;
	}) {
		if (!this._isPlaying) return;

		const deltaTime = timestamp - prevTimestamp;

		const frameDurationPassed = deltaTime > this._frameDuration;

		requestAnimationFrame((nextTimestamp) =>
			this._tick.bind(this)({
				anchor,
				timestamp: nextTimestamp,
				prevTimestamp: frameDurationPassed ? timestamp : prevTimestamp
			})
		);

		if (!frameDurationPassed) return;

		// elapsed time in seconds offseted by the start time
		const elapsed = (timestamp - anchor) / 1000;

		console.log(
			"anchor",
			anchor,
			"elapsed",
			elapsed,
			"next frame timestamp",
			this._nextFrame?.timestamp
		);

		void this._drawNextFrame(elapsed); // offset it by the start time
	}

	private async _drawNextFrame(elapsed: number) {
		assert(this._videoPrope);
		assert(this._nextFrame);
		assert(this.canvas);
		assert(this.canvasCtx);

		let alignedTime = this._getAlignedTime();

		// Downsampling, skip frames until the next free slot in the frame grid
		while (alignedTime <= this._lastAlignedTimestamp) {
			await this._updateNextFrame();
			alignedTime = this._getAlignedTime();
		}

		// Upsampling, duplicate frames/don't move the next frame until it's time has elapsed.
		const frameEndTime = this._nextFrame.timestamp + this._videoPrope.fps / 1000;
		if (elapsed < frameEndTime) return;

		this._lastAlignedTimestamp = alignedTime;

		const nextCanvas = this._nextFrame.canvas;
		this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.canvasCtx.drawImage(
			nextCanvas,
			0,
			0,
			nextCanvas.width * this.scale,
			nextCanvas.height * this.scale
		);

		await this._updateNextFrame();
	}

	private _getAlignedTime() {
		assert(this._nextFrame);

		return Math.floor(this._nextFrame.timestamp * this.targetFps) / this.targetFps;
	}

	private async _updateNextFrame() {
		const nextFrame = (await this._videoFrameIterator?.next())?.value ?? null;

		if (!nextFrame) return;

		this._nextFrame = nextFrame;
	}

	async play(startTime?: number) {
		// update the video frame iterator on play depending on the starting position
		console.log("next frame timestamp", this._nextFrame?.timestamp);

		this._videoFrameIterator = await this._createVideoFrameIterator(
			startTime ?? this._nextFrame?.timestamp ?? 0
		);
		this._lastAlignedTimestamp = this._getAlignedTime();
		this._nextFrame = (await this._videoFrameIterator.next()).value ?? null;

		this._isPlaying = true;

		this._render();
	}

	stop() {
		if (!this._videoFrameIterator) return;

		this._isPlaying = false;
		this._videoFrameIterator.return();
	}
}
