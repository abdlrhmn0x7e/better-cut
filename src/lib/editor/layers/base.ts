import type { BaseLayerOptions, LayerType, SerializedLayer, TimeOptions } from "./types";

export abstract class BaseLayer {
	public id: string;
	public type: LayerType;
	public startOffset = 0;
	public startTime: number = 0;
	public duration: number | null = null;

	constructor({ type, startOffset }: BaseLayerOptions) {
		this.id = crypto.randomUUID();
		this.startOffset = startOffset;
		this.type = type;
	}

	abstract update(options: TimeOptions): Promise<void>;
	abstract start(options: TimeOptions): Promise<void>;
	abstract stop(options: TimeOptions): Promise<void>;
	abstract toJSON(): SerializedLayer;
}
