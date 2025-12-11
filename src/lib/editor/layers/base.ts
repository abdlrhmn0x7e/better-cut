export type LayerType = "video" | "audio" | "image";

export type BaseLayerOptions = {
	src: File;
	type: LayerType;
};

export type TimeOptions = { anchor: number; time: number };

export abstract class BaseLayer {
	public id: string;
	public type: LayerType;
	public src: File;
	public startTime: number = 0;
	public duration: number | null = null;
	public startOffset = 0;

	constructor({ src, type }: BaseLayerOptions) {
		this.id = crypto.randomUUID();
		this.src = src;
		this.type = type;
	}

	abstract update(options: TimeOptions): Promise<void>;
	abstract start(options: TimeOptions): Promise<void>;
	abstract stop(options: TimeOptions): Promise<void>;
}
