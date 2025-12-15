import type { Composition } from "../composition";
import type { BaseLayer } from "../layers";
import { Command } from "./command";

interface AddLayerCommandOptions {
	comp: Composition;
	layer: BaseLayer;
}

export class AddLayerCommand extends Command {
	private _layer: BaseLayer;
	private _comp: Composition;

	constructor({ comp, layer }: AddLayerCommandOptions) {
		super();
		this._comp = comp;
		this._layer = layer;
	}

	execute() {
		this._comp.insertLayer(this._layer);
	}

	undo() {
		this._comp.removeLayer(this._layer.id);
	}
}
