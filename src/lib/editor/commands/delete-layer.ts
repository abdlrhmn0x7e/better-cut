import type { Composition } from "../composition";
import type { BaseLayer } from "../layers";
import { Command } from "./command";

interface RemoveLayerCommandOptions {
	comp: Composition;
	layer: BaseLayer;
}

export class RemoveLayerCommand extends Command {
	private _layer: BaseLayer;
	private _comp: Composition;

	constructor({ comp, layer }: RemoveLayerCommandOptions) {
		super();
		this._comp = comp;
		this._layer = layer;
	}

	execute() {
		this._comp.removeLayer(this._layer.id);
	}

	undo() {
		this._comp.insertLayer(this._layer);
	}
}
