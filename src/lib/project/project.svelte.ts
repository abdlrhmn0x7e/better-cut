import { Composition, type CompositionOptions } from "$lib/editor/composition";
import { FileManager } from "$lib/media/file-manager.svelte";
import { assert } from "$lib/utils/assert";
import { SvelteDate } from "svelte/reactivity";
import type { ProjectData, ProjectOptions, SerializedProject } from "./types";

const PROJECT_SUFFIX = ".project.json";
export class Project implements ProjectData {
	public id: string;
	public name: string;
	public createdAt: Date;
	public updatedAt: Date;
	public lastSavedAt: Date;
	public fileIds: string[];
	public compositions: Composition[] = [];

	private _fileManager: FileManager | null = null;

	private constructor({ name, fileIds }: ProjectOptions = {}) {
		this.id = crypto.randomUUID();
		this.name = name ?? `project-${this.id}`;
		this.fileIds = $state(fileIds ?? []);
		this.createdAt = new SvelteDate();
		this.updatedAt = new SvelteDate();
		this.lastSavedAt = new SvelteDate();
	}

	public static async init(options?: ProjectOptions) {
		const project = new Project(options);
		await project._init();
		return project;
	}

	private async _init() {
		this._fileManager = await FileManager.init();
		await this._fileManager.storeJSON(this.id + PROJECT_SUFFIX, this.toJSON());
	}

	public async getFiles() {
		assert(this._fileManager);

		const list = await this._fileManager.list();
		return list;
	}

	public async addFile(file: File) {
		assert(this._fileManager);
		const meta = await this._fileManager.store(file);
		this.fileIds.push(meta.id);
		this._update();
	}

	async removeFile(fileId: string) {
		assert(this._fileManager);
		await this._fileManager.delete(fileId);
		this.fileIds = this.fileIds.filter((id) => id !== fileId);
		this._update();
	}

	createComposition(options?: CompositionOptions) {
		assert(this._fileManager);
		const newComp = new Composition({ ...options, fileManager: this._fileManager });
		this.compositions.push(newComp);
		this._update();
	}

	deleteComposition(id: string) {
		this.compositions = this.compositions.filter((comp) => comp.id !== id);
		this._update();
	}

	private _update() {
		this.updatedAt = new SvelteDate();
	}

	toJSON(): SerializedProject {
		return {
			id: this.id,
			name: this.name,
			fileIds: this.fileIds,
			createdAt: this.createdAt.toISOString(),
			updatedAt: this.updatedAt.toISOString(),
			compositions: this.compositions.map((comp) => comp.toJSON())
		};
	}

	static async fromJSON(json: SerializedProject) {
		const { compositions, ...options } = json;
		const project = new Project(options);
		await project._init();

		await Promise.all(
			compositions.map(async (serializedComp) => {
				assert(project._fileManager);

				const comp = await Composition.fromJSON(serializedComp, project._fileManager);
				project.compositions.push(comp);
			})
		);

		return project;
	}

	async save() {
		assert(this._fileManager);
		await this._fileManager.OverrideJSON(this.id + PROJECT_SUFFIX, this.toJSON());

		this.lastSavedAt = new SvelteDate();
	}

	static async load(id: string) {
		const fileManager = await FileManager.init();

		const json = await fileManager.retrieveJSON<SerializedProject>(id, PROJECT_SUFFIX);
		if (!json) throw new Error("Project not found");

		return await Project.fromJSON(json);
	}
}
