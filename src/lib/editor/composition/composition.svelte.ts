import { PROJECTS_DIR } from "$lib/project/constants";
import { assert } from "$lib/utils/assert";
import { SvelteMap } from "svelte/reactivity";
import { BaseLayer, type Drawable, type Playable } from "../layers";
import { createLayer } from "../layers/factory";
import type { CompositionOptions, SerializedComposition } from "./types";
import { getFileManager } from "$lib/media";

// there should be a layer class for it since compositions could be layers also
export class Composition {
	public id: string;
	private _projectId: string;

	public fps: number;
	public name: string;
	public duration: number;
	public playing: boolean;
	public aspectRatio: number;
	public currentTimestamp: number;

	public layers = new SvelteMap<string, BaseLayer>(); // id to layer map
	public layersByZIndex: BaseLayer[] = [];

	public audioCtx: AudioContext;

	private _canvas: HTMLCanvasElement | null;
	private _canvasCtx: CanvasRenderingContext2D | null;

	private _rAFHandle: number | null = null;
	private _asyncId = 0;

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

	insertLayer(layer: BaseLayer) {
		layer.attach(this);
		this.layers.set(layer.id, layer);
		this.layersByZIndex = Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
	}

	removeLayer(layerId: string) {
		const layer = this.layers.get(layerId);
		if (!layer) throw new Error(`Layer with id ${layerId} not found`);
		void layer.detach(); // this is intentional detaching the layer should happen in the background
		this.layers.delete(layerId);

		// idk if thats necessary yet
		this.layersByZIndex = Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
	}

	async seek(time: number) {
		assert(this._canvas);
		assert(this._canvasCtx);

		if (time < 0 || time > this.duration) return;

		// stop ticking while seeking
		const wasPlaying = this.playing;
		await this.stop();

		this.currentTimestamp = time;

		await this._drawLayers(this.currentTimestamp);

		// optionally resume playback
		if (wasPlaying) {
			this.start();
		}
	}

	async start() {
		if (this.playing) return;
		this.playing = true;

		if (this.audioCtx.state === "suspended") {
			await this.audioCtx.resume();
		}

		for (const layer of this.layers.values()) {
			if (this._isPlayable(layer)) {
				void layer.onPlay(this.currentTimestamp);
			}
		}

		this._scheduleTick();
	}

	private _scheduleTick() {
		this._asyncId++;

		this._rAFHandle = requestAnimationFrame(() => {
			void this._tick.bind(this)({
				asyncId: this._asyncId,
				anchor: this.audioCtx.currentTime - this.currentTimestamp
			});
		});
	}

	private async _tick({ anchor, asyncId }: { anchor: number; asyncId: number }) {
		// if we're not playing return
		if (!this.playing) return;

		if (asyncId < this._asyncId || asyncId > this._asyncId) return;

		assert(this._canvas);
		assert(this._canvasCtx);

		if (this._rAFHandle) cancelAnimationFrame(this._rAFHandle);

		this.currentTimestamp = this.audioCtx.currentTime - anchor;

		await this._drawLayers(this.currentTimestamp);

		requestAnimationFrame(() => {
			this._tick.bind(this)({
				asyncId,
				anchor
			});
		});
	}

	private async _drawLayers(timestamp: number) {
		assert(this._canvas);

		const promises = this.layersByZIndex.map(async (layer) => {
			if (!layer.isActiveAt(timestamp)) return null;
			if (!this._isDrawable(layer)) return null;

			try {
				return await layer.getFrame(timestamp);
			} catch (e) {
				console.error(e);
				return null;
			}
		});

		const frames = await Promise.all(promises);

		const composite = new OffscreenCanvas(this._canvas.width, this._canvas.height);
		const ctx = composite.getContext("2d");
		if (!ctx) return;

		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
		for (const frame of frames) {
			if (frame) ctx.drawImage(frame, 0, 0, frame.width / 2, frame.height / 2); // divide by 2 temporarely until it's customizable
		}

		this._drawFrame(composite);
	}

	private _drawFrame(frame: HTMLCanvasElement | OffscreenCanvas) {
		assert(this._canvasCtx);

		this._canvasCtx.drawImage(frame, 0, 0, frame.width, frame.height); // divide by 2 temporarely until it's customizable
	}

	private _isDrawable(layer: BaseLayer): layer is Drawable {
		return "getFrame" in layer;
	}
	private _isPlayable(layer: BaseLayer): layer is Playable {
		return "onPlay" in layer && "onPause" in layer;
	}

	async stop() {
		if (!this.playing) return;

		this.playing = false;
		for (const layer of this.layers.values()) {
			if (this._isPlayable(layer)) {
				void layer.onPause();
			}
		}
	}

	setCurrentTimestamp(time: number) {
		if (time < 0 || time > this.duration) return;

		this.currentTimestamp = time;
		this.seek(time); // dummy anchor
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
