import { PROJECTS_DIR } from "$lib/project/constants";
import { assert } from "$lib/utils/assert";
import { SvelteMap } from "svelte/reactivity";
import { BaseLayer, VideoLayer } from "../layers";
import { createLayer } from "../layers/factory";
import type { CompositionOptions, SerializedComposition } from "./types";
import { getFileManager } from "$lib/media";

// there should be a layer class for it since compositions could be layers also
export class Composition {
	public id: string;
	public fps: number;
	public name: string;
	public duration: number;
	public playing: boolean;
	public aspectRatio: number;
	public currentTimestamp: number;
	public layers = new SvelteMap<string, BaseLayer>();
	public audioCtx: AudioContext;

	private _projectId: string;
	private _isSeeking = false;
	private _canvas: HTMLCanvasElement | null;
	private _canvasCtx: CanvasRenderingContext2D | null;

	constructor({ aspectRatio = 16 / 9, id, duration, projectId, fps, name }: CompositionOptions) {
		this.id = id ?? (crypto.randomUUID() as string);
		this.fps = fps ?? 24;
		this.name = name ?? `comp-${this.id}`;
		this.duration = duration ?? 60;
		this.aspectRatio = aspectRatio;

		this._projectId = projectId;

		this.audioCtx = new AudioContext();

		this._canvas = null;
		this._canvasCtx = null;

		// Reactive state
		this.currentTimestamp = $state(0);
		this.playing = $state(false);
	}

	setCurrentTimestamp(time: number) {
		if (time < 0 || time > this.duration) return;

		this.currentTimestamp = time;
		this.seek(time); // dummy anchor
	}

	insertLayer(layer: BaseLayer) {
		layer.attach(this);
		this.layers.set(layer.id, layer);
	}

	removeLayer(layerId: string) {
		const layer = this.layers.get(layerId);
		if (!layer) throw new Error(`Layer with id ${layerId} not found`);
		void layer.detach(); // this is intentional detaching the layer should happen in the background
		this.layers.delete(layerId);
	}

	async start() {
		if (this.playing) return;
		this.playing = true;

		if (this.audioCtx.state === "suspended") {
			await this.audioCtx.resume();
		}

		const anchor = this.audioCtx.currentTime - this.currentTimestamp;
		this.currentTimestamp = this.audioCtx.currentTime - anchor;

		for (const layer of this.layers.values()) {
			await layer.start({
				anchor,
				time: this.currentTimestamp
			});
		}

		requestAnimationFrame(() => {
			this._tick.bind(this)({
				anchor: this.audioCtx.currentTime - this.currentTimestamp
			});
		});
	}

	private _tick({ anchor }: { anchor: number }) {
		assert(this._canvas);
		assert(this._canvasCtx);

		// if we're not playing return
		if (!this.playing) return;

		this.currentTimestamp = this.audioCtx.currentTime - anchor;

		this._canvasCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);

		// order of which layer is updated first doesn't matter for now
		// running those in parallel is fine until now...
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

	async stop() {
		if (!this.playing) return;

		this.playing = false;
		await Promise.all(
			this.layers.values().map((layer) =>
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

		const anchor = this.audioCtx.currentTime - time;

		await Promise.all(
			Array.from(this.layers.values()).map(async (layer) => {
				const opts = { anchor, time };
				await layer.stop(opts);
				await layer.start(opts);
			})
		);

		// draw once after all layers are updated
		this._canvasCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);
		for (const layer of this.layers.values()) {
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
			projectId: this._projectId,
			aspectRatio: this.aspectRatio,
			layers: Array.from(this.layers.values()).map((layer) => layer.toJSON())
		};
	}

	static async fromJSON(json: SerializedComposition) {
		const { layers, ...options } = json;

		const comp = new Composition(options);
		const recreatedLayers = await Promise.all(
			layers.map((layerOptions) => createLayer(layerOptions))
		);

		for (const layer of recreatedLayers) {
			comp.insertLayer(layer);
		}

		return comp;
	}

	async save() {
		const fileManager = await getFileManager();
		await fileManager.writeJSON({
			id: this.id,
			json: this.toJSON(),
			dir: this.projectCompositionsDir
		});
	}

	get projectCompositionsDir() {
		return `${PROJECTS_DIR}/${this._projectId}/compositions`;
	}
}
