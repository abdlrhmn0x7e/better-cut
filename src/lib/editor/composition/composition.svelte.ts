import { getFileManager } from "$lib/media";
import { assert } from "$lib/utils/assert";
import { BaseLayer, VideoLayer } from "../layers";
import type { BaseLayerOptions } from "../layers/types";
import type { CompositionOptions, SerializedComposition } from "./types";

export class Composition {
	public id: string;
	public fps: number;
	public name: string;
	public duration: number;
	public playing: boolean;
	public aspectRatio: number;
	public currentTimestamp: number;
	public layers: Array<BaseLayer> = $state([]);

	private _isSeeking = false;
	private _audioCtx: AudioContext;
	private _canvas: HTMLCanvasElement | null;
	private _canvasCtx: CanvasRenderingContext2D | null;

	constructor({ aspectRatio = 16 / 9, id, duration, fps, name }: CompositionOptions = {}) {
		this.id = id ?? (crypto.randomUUID() as string);
		this.fps = fps ?? 24;
		this.name = name ?? `comp-${this.id}`;
		this.duration = duration ?? 60;
		this.aspectRatio = aspectRatio;

		this._audioCtx = new AudioContext();

		this._canvas = null;
		this._canvasCtx = null;

		// Reactive state
		this.currentTimestamp = $state(0);
		this.playing = $state(false);
	}

	setCurrentTimestamp(time: number) {
		if (time < 0 || time > this.duration) return;

		this.currentTimestamp = time;
		this.seek(time);
	}

	async addLayer(layerOptions: BaseLayerOptions & { dir?: string; fileId?: string }) {
		const { type, fileId, dir, ...options } = layerOptions;

		switch (type) {
			case "video": {
				assert(fileId);
				assert(dir);

				const fileManager = await getFileManager();
				const src = await fileManager.retrieve({
					id: fileId,
					dir
				});
				if (!src) throw new Error(`File with id ${fileId} not found`);

				const layer = await VideoLayer.init(src, {
					targetFps: this.fps,
					audioCtx: this._audioCtx,
					fileId,
					...options
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
		assert(this._canvas);
		assert(this._canvasCtx);

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
		assert(this._canvasCtx);

		this._canvasCtx.drawImage(layer.canvas, 0, 0, layer.canvas.width, layer.canvas.height);
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
		assert(this._canvas);
		assert(this._canvasCtx);

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
		assert(this._canvas);

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

	set canvas(canvas: HTMLCanvasElement) {
		this._canvas = canvas;

		this._canvas.width = 1920;
		this._canvas.height = 1080;

		const canvasCtx = this._canvas.getContext("2d");
		if (!canvasCtx) throw new Error("Your browser doesn't support 2d context canvas");

		this._canvasCtx = canvasCtx;

		// initilaiz a stage
		this.rescale();
	}

	toJSON(): SerializedComposition {
		return {
			id: this.id,
			fps: this.fps,
			name: this.name,
			duration: this.duration,
			aspectRatio: this.aspectRatio,
			layers: this.layers.map((layer) => layer.toJSON())
		};
	}

	static async fromJSON(projectFilesDir: string, json: SerializedComposition) {
		const { layers, ...options } = json;

		const comp = new Composition(options);
		await Promise.all(
			layers.map((layerOptions) => comp.addLayer({ ...layerOptions, dir: projectFilesDir }))
		);

		return comp;
	}
}
