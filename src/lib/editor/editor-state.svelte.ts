import type { FileMeta } from "$lib/media";
import { Project } from "$lib/project";
import { assert } from "$lib/utils/assert";
import { createContext } from "svelte";
import { CommandHistory } from "./commands/history.svelte";
import { Composition, type CompositionOptions } from "./composition";
import { toast } from "svelte-sonner";
import { SvelteMap } from "svelte/reactivity";
import { AddLayerCommand } from "./commands/add-layer";
import { createLayer } from "./layers/factory";
import type { LayerOptions } from "./layers";
import { RemoveLayerCommand } from "./commands/remove-layer";

export class EditorState {
	public isSaving = $state(false);
	public project: Project | null = null;
	public files = $state<FileMeta[]>([]);
	public history = new CommandHistory();
	public compositions = new SvelteMap<string, Composition>([]);
	public status = $state<"loading" | "ready" | "error">("loading");

	private _activeCompositionId: string | null = $state(null);
	private _activeLayerId: string | null = null;

	constructor(projectId: string) {
		void this.init(projectId);
	}

	async init(projectId: string) {
		try {
			this.project = await Project.load(projectId);
			this.files = await this.project.getFiles();

			const serializedComps = await this.project.getCompositions();
			console.log("serialized comps", serializedComps);
			await Promise.all(
				serializedComps.map(async (comp) =>
					this.compositions.set(comp.id, await Composition.fromJSON(comp))
				)
			);
			this._activeCompositionId = serializedComps[0]?.id ?? null;
			console.log("active comp", this.activeComposition);

			this.status = "ready";
		} catch {
			this.status = "error";
		}
	}

	async addFile(file: File) {
		assert(this.project);
		const meta = await this.project.addFile(file);
		this.files.push(meta);
	}

	async removeFile(id: string) {
		assert(this.project);
		await this.project.removeFile(id);
		this.files = this.files.filter((f) => f.id !== id);
	}

	/**
	 * Creates a new composition (timeline) within the project.
	 *
	 * @param options - Composition settings (fps, duration, aspect ratio, etc.)
	 */
	createComposition(options?: CompositionOptions) {
		assert(this.project);

		const newComp = new Composition(options ?? { projectId: this.project.id });
		this.compositions.set(newComp.id, newComp);

		void this.project.addComposition(newComp).catch(() => {
			toast.error("couldn't create the compisitons");

			// rollback changes
			this.compositions.delete(newComp.id);
		}); // happens in the background

		return newComp;
	}

	deleteComposition(compId: string): void {
		assert(this.project);
		const deletedComp = this.compositions.get(compId);
		this.compositions.delete(compId);
		void this.project.removeComposition(compId).catch(() => {
			toast.error("couldn't delete the compisitons");

			if (!deletedComp) return;
			this.compositions.set(deletedComp.id, deletedComp);
		}); // happens in the background
	}

	async addLayer(options: Omit<LayerOptions, "projectId">) {
		assert(this.activeComposition);
		assert(this.project);
		const layer = await createLayer({ ...options, projectId: this.project.id });
		this.history.execute(new AddLayerCommand({ comp: this.activeComposition, layer }));
	}

	async deleteLayer() {
		assert(this.activeComposition);
		assert(this.activeLayer);
		this.history.execute(
			new RemoveLayerCommand({ comp: this.activeComposition, layer: this.activeLayer })
		);
	}

	async save() {
		console.log("saving");
		assert(this.project);
		this.isSaving = true;
		await this.project.save();
		if (this.activeComposition) {
			await this.activeComposition.save();
		}
		this.isSaving = false;
	}

	get activeComposition() {
		if (!this._activeCompositionId) return undefined;
		return this.compositions.get(this._activeCompositionId);
	}

	set activeComposition(comp: Composition | undefined) {
		if (!comp) this._activeCompositionId = null;
		else this._activeCompositionId = comp.id;
	}

	get activeLayer() {
		if (!this.activeComposition || !this._activeLayerId) return undefined;
		return this.activeComposition.layers.get(this._activeLayerId);
	}
}

const [getEditorStateContext, setEditorStateContext] = createContext<EditorState>();

export function getEditorState() {
	return getEditorStateContext();
}

export function setEditorState(projectId: string) {
	const editor = new EditorState(projectId);
	return setEditorStateContext(editor);
}
