import type { Composition } from "../composition";
import { PROJECTS_DIR } from "$lib/project/constants";
import type { BaseLayerOptions, LayerType, SerializedLayer, TimeOptions } from "./types";
import type { MaybePromise } from "../types";

export abstract class BaseLayer {
	public id: string;
	public type: LayerType;
	public startOffset = $state(0);
	public startTime = $state(0);
	public endTime = $state<number | null>(null);
	public projectId: string;

	protected _comp: Composition | null = null;

	constructor({ type, startOffset, projectId }: BaseLayerOptions) {
		this.id = crypto.randomUUID();
		this.type = type;
		this.startOffset = startOffset;
		this.projectId = projectId;
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

	abstract update(options: TimeOptions): Promise<void>;
	abstract start(options: TimeOptions): Promise<void>;
	abstract stop(options: TimeOptions): Promise<void>;

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
