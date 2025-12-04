export type LayerType = "video" | "audio" | "image";

export type BaseLayerOptions = {
	src: File;
	type: LayerType;
};

export abstract class BaseLayer {
	public id: string;
	public type: LayerType;
	public src: File;
	public startTime: number = 0;
	public duration: number | null = null;

	constructor({ src, type }: BaseLayerOptions) {
		this.id = crypto.randomUUID();
		this.src = src;
		this.type = type;
	}

	abstract play(): void;
	abstract stop(): void;
}
