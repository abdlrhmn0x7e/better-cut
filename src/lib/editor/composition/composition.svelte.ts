import { getContext, setContext } from "svelte";
import { createVideoLayer } from "../layers/video";
import type { Layer, LayerOptions } from "./layers";

import Konva from "konva";

export interface CompositionOptions {
	container: HTMLDivElement;
	layers?: Array<Layer>;
}

export class Composition {
	public playing: boolean;
	public currentTime: number;
	public layers: Array<Layer>;

	private _stage: Konva.Stage;

	constructor(options: CompositionOptions) {
		// initilaiz a stage
		this._stage = new Konva.Stage({
			container: options.container,
			width: 360, // TODO: add an option to initialize a resolution
			height: 360
		});

		this._stage.container().style.backgroundColor = "var(--background)";

		// Reactive state
		this.layers = $state(options.layers ?? []);
		this.currentTime = $state(0);

		this.playing = $state(false);
	}

	render() {
		console.log("konvas layers", this._stage.getLayers());

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
