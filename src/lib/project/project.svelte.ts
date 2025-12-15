import { Composition, type CompositionOptions } from "$lib/editor/composition";
import { getFileManager, META_SUFFIX, type FileMeta } from "$lib/media";
import { SvelteDate } from "svelte/reactivity";
import type { ProjectData, ProjectOptions, SerializedProject } from "./types";
import { PROJECT_FILE, PROJECTS_DIR } from "./constants";
import { CommandHistory } from "$lib/editor/commands/history.svelte";

/**
 * Represents a video editing project with persistent storage.
 *
 * Projects are stored in OPFS with the following directory structure:
 * ```
 * better-cut-projects/
 *   {project-id}/
 *     project.json          # Project metadata and compositions
 *     files/
 *       {file-id}           # Media file binary
 *       {file-id}.metadata.json  # Media file metadata
 * ```
 *
 * ## Lifecycle
 *
 * ### Creating a new project
 * ```ts
 * const project = await Project.init({ name: "My Video" });
 * ```
 *
 * ### Loading an existing project
 * ```ts
 * const project = await Project.load("project-uuid");
 * ```
 *
 * ### Saving changes
 * ```ts
 * await project.save();
 * ```
 *
 * ## Reactive Properties
 * - `fileIds` - Tracks which media files belong to this project
 * - `createdAt`, `updatedAt`, `lastSavedAt` - Auto-updating timestamps
 *
 * @implements {ProjectData}
 */
export class Project implements ProjectData {
	/** Unique identifier for the project */
	public id: string;

	/** Display name of the project */
	public name: string;

	/** When the project was first created */
	public createdAt: Date;

	/** When the project was last modified (reactive) */
	public updatedAt: Date;

	/** When the project was last persisted to storage */
	public lastSavedAt: Date;

	/** IDs of media files stored in this project (reactive) */
	public fileIds: string[];

	/** Compositions (timelines) within this project */
	public compositions: Composition[] = [];

	public history = new CommandHistory();

	public activeCompositionId: string | null = $state(null);

	/**
	 * Private constructor - use `Project.init()` or `Project.load()` instead.
	 */
	private constructor({ id, name, fileIds, createdAt, updatedAt }: ProjectOptions = {}) {
		this.id = id ?? crypto.randomUUID();
		this.name = name ?? `project-${this.id}`;
		this.fileIds = $state(fileIds ?? []);
		this.createdAt = new SvelteDate(createdAt ?? Date.now());
		this.updatedAt = new SvelteDate(updatedAt ?? Date.now());
		this.lastSavedAt = new SvelteDate();
	}

	/**
	 * Creates and persists a new project.
	 *
	 * @param options - Initial project configuration
	 * @param mainCompositionOptions - Options for the default composition
	 * @returns The newly created project
	 *
	 * @example
	 * ```ts
	 * const project = await Project.init(
	 *   { name: "Wedding Video" },
	 *   { fps: 30, aspectRatio: 16/9 }
	 * );
	 * ```
	 */
	public static async init(
		options?: ProjectOptions,
		mainCompositionOptions?: CompositionOptions
	): Promise<Project> {
		const project = new Project(options);
		await project._init(mainCompositionOptions);
		return project;
	}

	/**
	 * Initializes the project by creating a default composition and persisting to storage.
	 */
	private async _init(mainCompositionOptions?: CompositionOptions): Promise<void> {
		this.createComposition(mainCompositionOptions);
		await this.save();
	}

	/**
	 * Lists all projects in storage.
	 *
	 * @returns Array of serialized project data
	 *
	 * @example
	 * ```ts
	 * const projects = await Project.list();
	 * for (const project of projects) {
	 *   console.log(project.name, project.id);
	 * }
	 * ```
	 */
	static async list(): Promise<SerializedProject[]> {
		const fileManager = await getFileManager();
		const projects = await fileManager.list(PROJECTS_DIR);
		const list: SerializedProject[] = [];
		await Promise.all(
			projects.map(async ([, handle]) => {
				if (!(handle instanceof FileSystemDirectoryHandle)) return;

				const projectFileHandle = await handle.getFileHandle(PROJECT_FILE);
				const project =
					await fileManager.readFileContentAsJSON<SerializedProject>(projectFileHandle);
				if (!project) return;

				list.push(project);
			})
		);

		return list;
	}

	/**
	 * Returns metadata for all media files in this project.
	 *
	 * @returns Array of file metadata (name, size, thumbnail, etc.)
	 */
	public async getFiles(): Promise<FileMeta[]> {
		const fileManager = await getFileManager();
		const files = await fileManager.list(this.filesDir);
		const list: FileMeta[] = [];
		await Promise.all(
			files.map(async ([name, handle]) => {
				if (!(handle instanceof FileSystemFileHandle)) return;
				if (!name.endsWith(META_SUFFIX)) return;

				const meta = await fileManager.readFileContentAsJSON(handle);
				if (!meta) return;

				list.push(meta);
			})
		);

		return list;
	}

	/**
	 * Imports a media file into the project.
	 * The file is copied to OPFS and its ID is tracked.
	 *
	 * @param file - The file to import
	 *
	 * @example
	 * ```ts
	 * const input = document.querySelector('input[type="file"]');
	 * await project.addFile(input.files[0]);
	 * ```
	 */
	public async addFile(file: File): Promise<void> {
		const fileManager = await getFileManager();
		const meta = await fileManager.store({
			file,
			dir: this.filesDir
		});
		this.fileIds.push(meta.id);
		this._update();
	}

	/**
	 * Removes a media file from the project.
	 * Deletes both the file and its metadata from storage.
	 *
	 * @param fileId - The UUID of the file to remove
	 */
	async removeFile(fileId: string): Promise<void> {
		const fileManager = await getFileManager();
		await fileManager.delete({
			id: fileId,
			dir: this.filesDir
		});
		this.fileIds = this.fileIds.filter((id) => id !== fileId);
		this._update();
	}

	/**
	 * Creates a new composition (timeline) within the project.
	 *
	 * @param options - Composition settings (fps, duration, aspect ratio, etc.)
	 */
	createComposition(options?: CompositionOptions): void {
		const newComp = new Composition(options ?? { projectId: this.id });
		this.compositions.push(newComp);
		this._update();
	}

	/**
	 * Deletes a composition from the project.
	 *
	 * @param id - The composition ID to delete
	 */
	deleteComposition(id: string): void {
		this.compositions = this.compositions.filter((comp) => comp.id !== id);
		this._update();
	}

	/**
	 * Marks the project as modified by updating the `updatedAt` timestamp.
	 */
	private _update(): void {
		this.updatedAt = new SvelteDate();
	}

	/**
	 * Serializes the project to a plain object for storage.
	 *
	 * @returns JSON-serializable representation of the project
	 */
	toJSON(): SerializedProject {
		return {
			id: this.id,
			name: this.name,
			fileIds: this.fileIds,
			createdAt: this.createdAt.toISOString(),
			updatedAt: this.updatedAt.toISOString(),
			lastSavedAt: this.lastSavedAt.toISOString(),
			compositions: this.compositions.map((comp) => comp.toJSON())
		};
	}

	/**
	 * Rehydrates a project from serialized JSON data.
	 * Used internally by `Project.load()`.
	 *
	 * @param json - Serialized project data
	 * @returns The rehydrated project instance
	 */
	static async fromJSON(json: SerializedProject): Promise<Project> {
		const { compositions, ...options } = json;
		const project = new Project(options);

		// we had to do a sequential loop becuase the order of the comps matters.
		for (const serializedComp of compositions) {
			const comp = await Composition.fromJSON(serializedComp);
			project.compositions.push(comp);
		}

		return project;
	}

	/**
	 * Persists the current project state to OPFS.
	 * Updates the `lastSavedAt` timestamp on success.
	 *
	 * @example
	 * ```ts
	 * project.name = "New Name";
	 * await project.save();
	 * ```
	 */
	async save(): Promise<void> {
		const fileManager = await getFileManager();
		await fileManager.writeJSON({
			id: PROJECT_FILE,
			dir: this.dir,
			json: this.toJSON()
		});

		this.lastSavedAt = new SvelteDate();
	}

	/**
	 * Loads an existing project from storage.
	 *
	 * @param id - The project UUID to load
	 * @returns The loaded project instance
	 * @throws Error if the project is not found
	 *
	 * @example
	 * ```ts
	 * try {
	 *   const project = await Project.load("abc-123");
	 * } catch (e) {
	 *   console.error("Project not found");
	 * }
	 * ```
	 */
	static async load(id: string): Promise<Project> {
		const fileManager = await getFileManager();

		const json = await fileManager.readJSON<SerializedProject>({
			id: PROJECT_FILE,
			dir: `${PROJECTS_DIR}/${id}`
		});
		if (!json) throw new Error("Project not found");

		return Project.fromJSON(json);
	}

	/**
	 * The root directory for this project in OPFS.
	 * @example "better-cut-projects/abc-123-uuid"
	 */
	get dir(): string {
		return `${PROJECTS_DIR}/${this.id}`;
	}

	/**
	 * The directory where media files are stored for this project.
	 * @example "better-cut-projects/abc-123-uuid/files"
	 */
	get filesDir(): string {
		return `${this.dir}/files`;
	}
}
