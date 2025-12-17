import {
	ALL_FORMATS,
	AudioBufferSink,
	BlobSource,
	CanvasSink,
	Input,
	InputAudioTrack,
	InputVideoTrack,
	type PacketStats
} from "mediabunny";
import { getFileManager } from ".";

export interface MediaSourceOptions {
	input: Input;
	duration: number;
	videoTrack: InputVideoTrack | null;
	audioTrack: InputAudioTrack | null;
}

export interface CreateMediaSourceOptions {
	fileId: string;
	projectFilesDir: string;
}

export interface VideoDimensions {
	width: number;
	height: number;
}

export interface VideoSinkOptions {
	width?: number;
	height?: number;
}

export class MediaSource {
	public duration: number;

	protected input: Input;
	protected videoTrack: InputVideoTrack | null;
	protected audioTrack: InputAudioTrack | null;

	private _canvasSink: CanvasSink | null = null;
	private _videoStats: PacketStats | null = null;
	private _audioBufferSink: AudioBufferSink | null = null;
	private _videoSinkOptions: VideoSinkOptions | null = null;

	private constructor({ input, duration, videoTrack, audioTrack }: MediaSourceOptions) {
		this.input = input;
		this.duration = duration;
		this.videoTrack = videoTrack;
		this.audioTrack = audioTrack;
	}

	static async create({ fileId, projectFilesDir }: CreateMediaSourceOptions): Promise<MediaSource> {
		const fileManager = await getFileManager();
		const file = await fileManager.retrieve({
			id: fileId,
			dir: projectFilesDir
		});
		if (!file) throw new Error(`The file with the id ${fileId} couldn't be found`);

		const input = new Input({
			formats: ALL_FORMATS,
			source: new BlobSource(file)
		});
		const [duration, videoTrack, audioTrack] = await Promise.all([
			input.computeDuration(),
			input.getPrimaryVideoTrack(),
			input.getPrimaryAudioTrack()
		]);
		return new MediaSource({
			input,
			duration,
			videoTrack,
			audioTrack
		});
	}

	get hasVideo(): boolean {
		return this.videoTrack !== null;
	}

	get hasAudio(): boolean {
		return this.audioTrack !== null;
	}

	get videoDimensions(): VideoDimensions | null {
		if (!this.videoTrack) return null;

		return {
			width: this.videoTrack.displayWidth,
			height: this.videoTrack.displayHeight
		};
	}

	async getVideoFps() {
		if (!this.videoTrack) return null;

		if (!this._videoStats) {
			this._videoStats = await this.videoTrack.computePacketStats();
		}

		return this._videoStats.averagePacketRate;
	}

	getVideoSink() {
		if (!this.videoTrack) throw new Error("This media source has no video");

		if (!this._canvasSink) {
			this._canvasSink = new CanvasSink(this.videoTrack, {
				poolSize: 0,
				...this._videoSinkOptions
			});
		}

		return this._canvasSink;
	}

	setVideoSinkOptions(options: VideoSinkOptions) {
		this._canvasSink = null;
		this._videoSinkOptions = { ...this._videoSinkOptions, ...options };
	}

	getAudioSink() {
		if (!this.audioTrack) throw new Error("This media source has no audio");

		if (!this._audioBufferSink) {
			this._audioBufferSink = new AudioBufferSink(this.audioTrack);
		}

		return this._audioBufferSink;
	}

	dispose() {
		this.input.dispose();
	}
}
