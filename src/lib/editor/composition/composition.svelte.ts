import { getContext, setContext } from "svelte";
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
	public layers: Array<Layer>;
	public aspectRatio: number;

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

		console.log("w before", width, "h before", height);

		if (scaledByWidth) {
			height = width / this.aspectRatio;
			width = height * this.aspectRatio;
		} else {
			width = height * this.aspectRatio;
			height = width / this.aspectRatio;
		}

		console.log("w after", width, "h after", height);

		this._stage.size({
			width,
			height
		});
	}
}

const DEFAULT_KEY = "$_composition";

export const getCompisitionState = (key = DEFAULT_KEY) => {
	return getContext<{ comp: Composition | null }>(key);
};

let comp: Composition | null = $state(null);

export const setCompisitionState = (options?: CompositionOptions, key = DEFAULT_KEY) => {
	if (options) comp = new Composition(options);

	return setContext(key, { comp });
};
