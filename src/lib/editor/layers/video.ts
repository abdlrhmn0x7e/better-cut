import {
	AudioBufferSink,
	CanvasSink,
	type WrappedAudioBuffer,
	type WrappedCanvas
} from "mediabunny";
import { probeVideo, type VideoProbe } from "../media/mediabunny.ts";
import { BaseLayer, type BaseLayerOptions } from "./base.ts";
import { assert } from "$lib/utils/misc";

type VideoLayerOptions = Omit<BaseLayerOptions, "type"> & {
	scale: number;
	targetFps: number;
	audioCtx: AudioContext;
	canvas: HTMLCanvasElement;
};

export class VideoLayer extends BaseLayer {
	public scale: number;
	public startOffset = 0;

	private _cache = new Map<number, WrappedCanvas>();

	private _videoPrope: VideoProbe | null = null;
	private _videoFrameIterator: AsyncGenerator<WrappedCanvas, void, unknown> | null = null;
	private _videoSink: CanvasSink | null = null;

	private _currentFrame: WrappedCanvas | null = null;
	private _lastAlignedTimestamp = -1;

	public targetFps: number;

	private _audioCtx: AudioContext;
	private _audioSink: AudioBufferSink | null = null;
	private _audioGain: GainNode | null = null;
	private _audioIterator: AsyncGenerator<WrappedAudioBuffer, void, unknown> | null = null;
	private _audioNodesQueue: Set<AudioBufferSourceNode> = new Set();
	private _isSchedulingAudio = false;
	private _lastScheduledAudioTimestamp = -1;

	private canvas: HTMLCanvasElement | null = null;
	private canvasCtx: CanvasRenderingContext2D | null = null;

	public isReady = false;

	private constructor({ targetFps, canvas, scale, audioCtx, ...base }: VideoLayerOptions) {
		super({ ...base, type: "video" });
		this.targetFps = targetFps;

		this.canvas = canvas;
		this.canvasCtx = this.canvas.getContext("2d");
		this._audioCtx = audioCtx;
		this.scale = scale;
	}

	private async _init() {
		this._videoPrope = await probeVideo(this.src);
		this._videoSink = new CanvasSink(this._videoPrope.video);
		this._videoFrameIterator = await this._createVideoFrameIterator();

		const firstFrame = (await this._videoFrameIterator.next()).value ?? null;
		this._currentFrame = (await this._videoFrameIterator.next()).value ?? null;

		if (!firstFrame) throw new Error("UNEXPECTED: This video has no frames");

		if (this._videoPrope.audio) {
			this._audioGain = this._audioCtx.createGain();
			this._audioGain.connect(this._audioCtx.destination);
			this._audioSink = new AudioBufferSink(this._videoPrope.audio);
			this._audioIterator = await this._createAudioIterator();
		}

		this.isReady = true;
		this.duration = this._videoPrope.duration;
	}

	private async _createVideoFrameIterator(startTime = 0) {
		if (!this._videoSink) throw new Error("a video sink must be initialized first");
		if (this._videoFrameIterator) await this._videoFrameIterator.return();

		return this._videoSink.canvases(startTime);
	}

	private async _createAudioIterator(startTime = 0) {
		if (!this._audioSink) throw new Error("an audio sink must be initialized first");
		if (this._audioIterator) await this._audioIterator.return();

		return this._audioSink.buffers(startTime);
	}

	static async init(options: VideoLayerOptions) {
		const layer = new VideoLayer(options);
		await layer._init();

		return layer;
	}

	/**
	 * Takes the composition current time and updates the canvas
	 * based on whether or not the current time intersects with this layer
	 * if it intersects it draws the corresponding frame to that time
	 * otherwise it returns
	 */
	async update(time: number) {
		assert(this._videoPrope);
		assert(this._currentFrame);
		assert(this.canvas);
		assert(this.canvasCtx);

		// const scheduleMoreAudio = this._lastScheduledAudioTimestamp - time < 2;
		// if (scheduleMoreAudio) void this._scheduleAudio(time);

		let alignedTime = this._getAlignedTime();
		console.log("aligned time", alignedTime);

		// Downsampling, skip frames until the next free slot in the frame grid
		while (alignedTime <= this._lastAlignedTimestamp) {
			await this._updateCurrentFrame(time);
			alignedTime = this._getAlignedTime();
		}

		// Upsampling, duplicate frames/don't move the next frame until it's time has elapsed.
		const frameEndTime = this._currentFrame.timestamp + this._videoPrope.fps / 1000;
		if (time < frameEndTime) return;

		this._lastAlignedTimestamp = alignedTime;

		const frame = this._cache.get(alignedTime);
		if (!frame) await this._setCache(alignedTime);

		const nextCanvas = this._currentFrame.canvas;
		this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.canvasCtx.drawImage(
			nextCanvas,
			0,
			0,
			nextCanvas.width * this.scale,
			nextCanvas.height * this.scale
		);

		await this._updateCurrentFrame();
	}

	private async _setCache(alignedTime: number) {
		assert(this._videoFrameIterator);
		await this._videoFrameIterator.return();

		const videoStartTime = alignedTime - this.startOffset;
		await this._createVideoFrameIterator(videoStartTime);

		const nextFrame = (await this._videoFrameIterator.next()).value ?? null;
		if (!nextFrame) return;

		this._currentFrame = nextFrame;
		this._cache.set(alignedTime, nextFrame);
	}

	private _getAlignedTime() {
		assert(this._currentFrame);

		return Math.floor(this._currentFrame.timestamp * this.targetFps) / this.targetFps;
	}

	private async _updateCurrentFrame() {
		const nextFrame = (await this._videoFrameIterator?.next())?.value ?? null;
		if (!nextFrame) return null;

		this._cache.set(this._getAlignedTime(), nextFrame);

		this._currentFrame = nextFrame;
	}

	async play(startTime?: number) {
		// update the video frame iterator on play depending on the starting position
		const videoStartPosition = startTime ?? this._currentFrame?.timestamp ?? 0;
		this._videoFrameIterator = await this._createVideoFrameIterator(videoStartPosition);

		this._audioIterator = await this._createAudioIterator(videoStartPosition);
		this._lastAlignedTimestamp = this._getAlignedTime();

		this._currentFrame = (await this._videoFrameIterator.next()).value ?? null;

		const audioStartPosition = this._audioCtx.currentTime - (this._currentFrame?.timestamp ?? 0);
		this._scheduleAudio(audioStartPosition);
	}

	async _scheduleAudio(anchor: number, duration = 4) {
		if (!this._audioSink || !this._audioIterator || !this._audioCtx || !this._audioGain) return;
		if (this._isSchedulingAudio) return; // to prevent concurrent calls

		let remaining = duration;
		this._isSchedulingAudio = true;

		let lastTimestamp = -1;
		while (remaining > 0) {
			const sample = (await this._audioIterator.next()).value;
			if (!sample) {
				console.log("no sample");
				break;
			}

			const { buffer, timestamp } = sample;
			const node = this._audioCtx.createBufferSource();
			node.buffer = buffer;
			node.connect(this._audioGain);

			const startTimestamp = anchor + timestamp;
			if (startTimestamp >= anchor) node.start(startTimestamp);
			else node.start(anchor, anchor - startTimestamp);

			remaining -= buffer.duration;
			lastTimestamp = timestamp + buffer.duration;

			this._audioNodesQueue.add(node);
			node.onended = () => {
				this._audioNodesQueue.delete(node);
			};
		}

		this._isSchedulingAudio = false;
		this._lastScheduledAudioTimestamp = lastTimestamp;
	}

	stop() {
		for (const node of this._audioNodesQueue) {
			node.stop();
		}
		this._audioNodesQueue.clear();
		this._isSchedulingAudio = false;
		this._lastScheduledAudioTimestamp = -1;

		this._isPlaying = false;
		this._videoFrameIterator?.return();
		this._audioIterator?.return();
	}
}
