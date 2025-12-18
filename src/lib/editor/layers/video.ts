import { AudioScheduler, MediaSource } from "$lib/media";
import { assert } from "$lib/utils/assert";
import { BaseLayer } from "./base.svelte.ts";

import type { Drawable, Playable, SerializedLayer, VideoLayerOptions } from "./types.ts";

export class VideoLayer extends BaseLayer implements Drawable, Playable {
	public readonly fileId: string;
	private _isDetached = false;

	protected mediaSource: MediaSource | null = null;
	protected audioScheduler: AudioScheduler | null = null;

	private constructor({ fileId, ...base }: VideoLayerOptions) {
		super({ type: "video", ...base });
		this.fileId = fileId;
	}

	static async create(options: VideoLayerOptions): Promise<VideoLayer> {
		const videoLayer = new VideoLayer(options);

		videoLayer.mediaSource = await MediaSource.create({
			fileId: videoLayer.fileId,
			projectFilesDir: videoLayer.projectFilesDir
		});
		videoLayer.endTime = videoLayer.mediaSource.duration;

		return videoLayer;
	}

	async getFrame(timestamp: number) {
		if (this._isDetached) return null;

		assert(this.mediaSource);

		const layerTime = this.getLayerTime(timestamp);
		const videoSink = this.mediaSource.getVideoSink();
		const wrappedCanvas = await videoSink.getCanvas(layerTime);
		if (!wrappedCanvas) return null;

		return wrappedCanvas.canvas;
	}

	async onPlay(timestamp: number) {
		if (this._isDetached) return;
		if (!this.audioScheduler) return;

		const layerTime = this.getLayerTime(timestamp);
		await this.audioScheduler.start(layerTime);
	}
	async onPause() {
		if (this._isDetached) return;
		if (!this.audioScheduler) return;
		await this.audioScheduler.stop();
	}

	setVolume(value: number) {
		if (this._isDetached) return;
		if (!this.audioScheduler) return;
		this.audioScheduler.setGain(value);
	}
	setPreviewResolution(width: number, height: number) {
		if (this._isDetached) return;
		if (!this.mediaSource) throw new Error("MediaSource is not initialized");

		this.mediaSource.setVideoSinkOptions({
			width,
			height
		});
	}

	protected onAttach() {
		assert(this.audioCtx);
		assert(this.mediaSource);

		if (!this.mediaSource.hasAudio) return;

		this.audioScheduler = new AudioScheduler({
			audioSink: this.mediaSource.getAudioSink(),
			audioCtx: this.audioCtx
		});
	}
	protected async onDetach() {
		if (this._isDetached) return;

		this._isDetached = true;
		if (this.mediaSource) this.mediaSource.dispose();
		if (this.audioScheduler) await this.audioScheduler.dispose();
		this.audioScheduler = null;
	}

	toJSON() {
		return {
			id: this.id,
			type: "video" as const,
			fileId: this.fileId,
			projectId: this.projectId,

			startOffset: this.startOffset,
			startTime: this.startTime,
			endTime: this.endTime,
			zIndex: this.zIndex
		};
	}
	static fromJSON(data: SerializedLayer) {
		return VideoLayer.create(data);
	}
}
