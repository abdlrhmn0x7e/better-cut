import type { Composition } from "../composition";
import { PROJECTS_DIR } from "$lib/project/constants";
import type { BaseLayerOptions, LayerType, SerializedLayer } from "./types";
import type { MaybePromise } from "../types";

export abstract class BaseLayer {
	public id: string;
	public type: LayerType;
	public projectId: string;

	public startOffset = $state(0);
	public startTime = $state(0);
	public endTime = $state<number | null>(null);
	public zIndex: number;

	protected _comp: Composition | null = null;

	constructor({ type, startOffset, projectId, zIndex }: BaseLayerOptions) {
		this.id = crypto.randomUUID();
		this.type = type;
		this.projectId = projectId;

		this.zIndex = zIndex;
		this.startOffset = startOffset;
	}

	attach(comp: Composition) {
		this._comp = comp;
		void this.onAttach();
	}

	detach() {
		const detach = this.onDetach();
		if (detach instanceof Promise) {
			detach.then(() => (this._comp = null));
		} else {
			this._comp = null;
		}
	}

	protected abstract onAttach(): MaybePromise<void>;
	protected abstract onDetach(): MaybePromise<void>;

	protected getLayerTime(timestamp: number) {
		return timestamp - this.startOffset;
	}

	public isActiveAt(timestamp: number) {
		const layerTime = this.getLayerTime(timestamp);
		return layerTime >= this.startTime && (this.endTime === null || layerTime < this.endTime);
	}

	abstract toJSON(): SerializedLayer;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	static fromJSON(serializedLayer: SerializedLayer): Promise<BaseLayer> {
		throw new Error("Method not implemented! Use derived class");
	}

	get projectFilesDir() {
		return `${PROJECTS_DIR}/${this.projectId}/files`;
	}
	get audioCtx() {
		return this._comp ? this._comp.audioCtx : null;
	}
}
