import { createVideoLayer } from "../layers/video";
import type { Layer, LayerOptions } from "./layers";

import Konva from "konva";

export interface CompositionOptions {
	container: HTMLDivElement;
	aspectRatio?: number; // TODO: User provided later on
	scale?: {
		x: number;
		y: number;
	};
	layers?: Array<Layer>;
}

export class Composition {
	public playing: boolean;
	public currentTime: number;
	public aspectRatio: number;
	public layers: Array<Layer>;

	private _stage: Konva.Stage;

	constructor({ container, aspectRatio = 16 / 9, layers }: CompositionOptions) {
		this.aspectRatio = aspectRatio;

		// initilaiz a stage
		this._stage = new Konva.Stage({
			container
		});

		this.rescale();

		// Reactive state
		this.layers = $state(layers ?? []);
		this.currentTime = $state(0);

		this.playing = $state(false);
	}

	render() {
		// loop over all layers? and play them?
		this.layers.forEach((layer) => layer.play());
	}

	async addLayer({ type, options }: LayerOptions) {
		let layer: Layer;

		switch (type) {
			case "video": {
				layer = await createVideoLayer(options);
			}
		}

		this._stage.add(layer.konvaLayer);
		this.layers.push(layer);
	}

	async addLayers(layers: Array<LayerOptions>) {
		await Promise.all(layers.map((layer) => this.addLayer(layer)));
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
