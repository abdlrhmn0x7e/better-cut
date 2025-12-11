import { assert } from "$lib/utils/misc";
import { BaseLayer, VideoLayer, type BaseLayerOptions } from "../layers";

export interface CompositionOptions {
	container: HTMLCanvasElement;
	aspectRatio?: number; // TODO: User provided later on
	scale?: {
		x: number;
		y: number;
	};
	layers?: Array<BaseLayer>;
}

export class Composition {
	public fps: number;
	public currentTimestamp: number;
	public playing: boolean;
	private _isSeeking = false;

	public scale = 0.75;

	private _audioCtx: AudioContext;

	public duration: number;

	public aspectRatio: number;
	public layers: Array<BaseLayer>;
	private _canvas: HTMLCanvasElement;
	private _canvasCtx: CanvasRenderingContext2D;
	private _cache = new Map<number, OffscreenCanvas>();

	constructor({ container, aspectRatio = 16 / 9, layers }: CompositionOptions) {
		this.fps = 24;
		this.duration = 60;
		this.aspectRatio = aspectRatio;

		this._audioCtx = new AudioContext();

		this._canvas = container;
		this._canvas.width = 1920;
		this._canvas.height = 1080;

		const canvasCtx = this._canvas.getContext("2d");
		if (!canvasCtx) throw new Error("Your browser doesn't support 2d context canvas");
		this._canvasCtx = canvasCtx;

		// initilaiz a stage
		this.rescale();

		// Reactive state
		this.layers = $state(layers ?? []);
		this.currentTimestamp = $state(0);
		this.playing = $state(false);
	}

	async addLayer({ type, src }: BaseLayerOptions) {
		switch (type) {
			case "video": {
				const layer = await VideoLayer.init({
					src,
					targetFps: this.fps,
					scale: this.scale - 0.35,
					audioCtx: this._audioCtx
				});
				this.layers.push(layer);
				break;
			}
		}
	}

	async play() {
		if (this.playing) return;
		this.playing = true;

		const anchor = this._audioCtx.currentTime - this.currentTimestamp;
		this.currentTimestamp = this._audioCtx.currentTime - anchor;

		for (const layer of this.layers) {
			await layer.start({
				anchor,
				time: this.currentTimestamp
			});
		}

		requestAnimationFrame(() => {
			this._tick.bind(this)({
				anchor: this._audioCtx.currentTime - this.currentTimestamp
			});
		});
	}

	private _tick({ anchor }: { anchor: number }) {
		// if we're not playing return
		if (!this.playing) return;

		this.currentTimestamp = this._audioCtx.currentTime - anchor;

		this._canvasCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);
		this.layers.forEach(async (layer) => {
			await layer.update({
				anchor,
				time: this.currentTimestamp
			});

			if (layer instanceof VideoLayer) {
				this.draw(layer);
			}
		});

		requestAnimationFrame(() => {
			this._tick.bind(this)({
				anchor
			});
		});
	}

	draw(layer: VideoLayer) {
		assert(layer.canvas);
		this._canvasCtx.drawImage(
			layer.canvas,
			0,
			0,
			layer.canvas.width * this.scale,
			layer.canvas.height * this.scale
		);
	}

	async pause() {
		if (!this.playing) return;

		this.playing = false;
		await Promise.all(
			this.layers.map((layer) =>
				layer.stop({
					anchor: this.currentTimestamp, // dummy
					time: this.currentTimestamp
				})
			)
		);
	}

	async seek(time: number) {
		if (this._isSeeking) return;
		if (time < 0 || time > this.duration) return;

		this._isSeeking = true;

		// stop ticking while seeking
		const wasPlaying = this.playing;
		this.playing = false;

		const anchor = this._audioCtx.currentTime - time;

		await Promise.all(
			this.layers.map(async (layer) => {
				const opts = { anchor, time };
				await layer.stop(opts);
				await layer.start(opts);
			})
		);

		// draw once after all layers are updated
		this._canvasCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);
		for (const layer of this.layers) {
			if (layer instanceof VideoLayer && layer.canvas) {
				console.log("drawing layer");
				this.draw(layer); // ensure draw uses latest frame
			}
		}

		this.currentTimestamp = time;

		// optionally resume playback
		if (wasPlaying) {
			this.playing = true;
			requestAnimationFrame(() => this._tick({ anchor }));
		}

		this._isSeeking = false;
	}

	rescale() {
		let width = this._canvas.parentElement?.clientWidth ?? 0;
		let height = this._canvas.parentElement?.clientHeight ?? 0;

		const scaledByWidth = width / this.aspectRatio <= height;

		if (scaledByWidth) {
			height = width / this.aspectRatio;
			width = height * this.aspectRatio;
		} else {
			width = height * this.aspectRatio;
			height = width / this.aspectRatio;
		}

		this._canvas.width = width;
		this._canvas.height = height;
	}
}
