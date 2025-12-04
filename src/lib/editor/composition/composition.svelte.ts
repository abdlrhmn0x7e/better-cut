import { BaseLayer, VideoLayer, type BaseLayerOptions } from "../layers";

import Konva from "konva";

export interface CompositionOptions {
	container: HTMLDivElement;
	aspectRatio?: number; // TODO: User provided later on
	scale?: {
		x: number;
		y: number;
	};
	layers?: Array<BaseLayer>;
}

export class Composition {
	public playhead: number;
	public playing: boolean;

	public duration: number;

	public aspectRatio: number;
	public layers: Array<BaseLayer>;

	private _stage: Konva.Stage;

	constructor({ container, aspectRatio = 16 / 9, layers }: CompositionOptions) {
		this.duration = 0;
		this.aspectRatio = aspectRatio;

		// initilaiz a stage
		this._stage = new Konva.Stage({
			container
		});

		this.rescale();

		// Reactive state
		this.layers = $state(layers ?? []);
		this.playhead = $state(0);
		this.playing = $state(false);
	}

	play() {
		this.layers[0].play();
	}

	pause() {
		this.layers[0].stop();
	}

	async addLayer({ type, src }: BaseLayerOptions) {
		switch (type) {
			case "video": {
				const layer = await VideoLayer.init({ src });
				this.layers.push(layer);
				if (layer.konvaLayer) {
					this._stage.add(layer.konvaLayer);
					this._stage.draw();
				}

				break;
			}
		}
	}

	rescale() {
		let width = this._stage.container().clientWidth;
		let height = this._stage.container().clientHeight;

		const scaledByWidth = width / this.aspectRatio <= height;

		if (scaledByWidth) {
			height = width / this.aspectRatio;
			width = height * this.aspectRatio;
		} else {
			width = height * this.aspectRatio;
			height = width / this.aspectRatio;
		}

		this._stage.size({
			width,
			height
		});
	}
}
