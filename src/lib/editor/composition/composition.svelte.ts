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
	public playhead: number;
	public playing: boolean;
	public scale = 0.75;

	public duration: number;

	public aspectRatio: number;
	public layers: Array<BaseLayer>;
	private _container: HTMLCanvasElement;

	constructor({ container, aspectRatio = 16 / 9, layers }: CompositionOptions) {
		this.fps = 24;
		this.duration = 0;
		this.aspectRatio = aspectRatio;

		this._container = container;
		this._container.width = 1920;
		this._container.height = 1080;

		// initilaiz a stage
		this.rescale();

		// Reactive state
		this.layers = $state(layers ?? []);
		this.playhead = $state(0);
		this.playing = $state(false);
	}

	play() {
		this.layers[0].play(this.playhead);
	}

	pause() {
		this.layers[0].stop();
	}

	async addLayer({ type, src }: BaseLayerOptions) {
		switch (type) {
			case "video": {
				const layer = await VideoLayer.init({
					src,
					targetFps: 10,
					canvas: this._container,
					scale: this.scale - 0.25
				});
				this.layers.push(layer);
				break;
			}
		}
	}

	rescale() {
		let width = this._container.parentElement?.clientWidth ?? 0;
		let height = this._container.parentElement?.clientHeight ?? 0;

		const scaledByWidth = width / this.aspectRatio <= height;

		if (scaledByWidth) {
			height = width / this.aspectRatio;
			width = height * this.aspectRatio;
		} else {
			width = height * this.aspectRatio;
			height = width / this.aspectRatio;
		}

		this._container.width = width;
		this._container.height = height;
	}
}
