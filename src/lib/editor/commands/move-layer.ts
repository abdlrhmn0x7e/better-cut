import type { BaseLayer } from "../layers";
import { Command } from "./command";

interface MoveLayerCommandOptions {
	layer: BaseLayer;
	delta: number;
}

export class MoveLayerCommand extends Command {
	private _layer: BaseLayer;
	private _delta;

	constructor({ layer, delta }: MoveLayerCommandOptions) {
		super();
		this._layer = layer;
		this._delta = delta;
	}

	execute() {
		this._layer.startOffset = Math.max(0, this._layer.startOffset + this._delta);
	}

	undo() {
		this._layer.startOffset = Math.max(0, this._layer.startOffset - this._delta);
	}
}
