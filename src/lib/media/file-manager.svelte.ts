import { assert } from "$lib/utils/assert";
import { getFileThumbnail } from "./thumbnail";
import type { FileMeta } from "./types";

export const META_SUFFIX = ".metadata.json";

/**
 * Manages file storage using the Origin Private File System (OPFS).
 *
 * Supports two storage patterns:
 *
 * ## 1. Media Files
 * Binary files (video, audio, images) stored with auto-generated UUID filenames.
 * Each file has a companion `.metadata.json` sidecar containing original filename,
 * MIME type, size, and thumbnail data URL.
 *
 * ## 2. JSON Documents
 * Arbitrary JSON objects stored with caller-provided IDs. Useful for project
 * configuration, settings, or any structured data.
 *
 * ## Directory Structure
 * Files can be organized into subdirectories using the `dir` parameter.
 * Nested paths are supported (e.g., `"projects/abc-123/files"`).
 *
 * @example
 * ```ts
 * // Get singleton instance
 * const fileManager = await getFileManager();
 *
 * // Store a media file in a project directory
 * const meta = await fileManager.store({
 *   file: videoFile,
 *   dir: "projects/my-project/files"
 * });
 *
 * // Retrieve it later
 * const file = await fileManager.retrieve({
 *   id: meta.id,
 *   dir: "projects/my-project/files"
 * });
 *
 * // List all media files in a directory
 * const files = await fileManager.list("projects/my-project/files");
 *
 * // Store project JSON
 * await fileManager.writeJSON({
 *   id: "project.json",
 *   dir: "projects/my-project",
 *   json: { name: "My Project", ... }
 * });
 *
 * // Read it back
 * const project = await fileManager.readJSON({
 *   id: "project.json",
 *   dir: "projects/my-project"
 * });
 * ```
 */
export class FileManager {
	private _opfsRoot: FileSystemDirectoryHandle | null = null;

	private constructor() {}

	/**
	 * Creates and initializes a new FileManager instance.
	 * Must be used instead of constructor since OPFS initialization is async.
	 */
	static async init(): Promise<FileManager> {
		const fileManager = new FileManager();
		await fileManager._init();
		return fileManager;
	}

	private async _init(): Promise<void> {
		this._opfsRoot = await navigator.storage.getDirectory();
	}

	/**
	 * Returns the directory handle for the given subdirectory, creating it if needed.
	 * If no directory is specified, returns the OPFS root.
	 */
	private async _getRoot(dir?: string): Promise<FileSystemDirectoryHandle> {
		assert(this._opfsRoot);
		let root: FileSystemDirectoryHandle = this._opfsRoot;

		if (!dir) return root;

		const components = dir.split("/").filter(Boolean);
		for (const dirName of components) {
			root = await root.getDirectoryHandle(dirName, { create: true });
		}

		return root;
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// Media File Operations
	// ─────────────────────────────────────────────────────────────────────────────

	/**
	 * Lists all stored media files with their metadata.
	 *
	 * @param dir - Optional subdirectory to list files from (supports nested paths)
	 * @returns Array of file metadata (excludes actual file data)
	 */
	async list(dir?: string): Promise<[string, FileSystemHandle][]> {
		assert(this._opfsRoot);

		const list: [string, FileSystemHandle][] = [];
		const root = await this._getRoot(dir);

		for await (const entry of root.entries()) {
			list.push(entry);
		}
		return list;
	}

	/**
	 * Stores a media file in OPFS and generates its metadata.
	 * File saving and thumbnail generation run in parallel for performance.
	 *
	 * @param file - The File object to store
	 * @returns Metadata for the stored file, including its generated UUID
	 */
	async store({ dir, file }: { dir: string; file: File }): Promise<FileMeta> {
		const id = crypto.randomUUID();

		const saveFile = async () => {
			const root = await this._getRoot(dir);
			const fileHandle = await root.getFileHandle(id, { create: true });
			const writable = await fileHandle.createWritable();
			await writable.write(file);
			await writable.close();
		};

		const [thumbnail] = await Promise.all([getFileThumbnail(file), saveFile()]);

		const meta: FileMeta = {
			id,
			mimeType: file.type,
			name: file.name,
			size: file.size,
			thumbnail
		};
		await this._writeMeta(meta, dir);

		return meta;
	}

	/**
	 * Retrieves a stored media file by its ID.
	 *
	 * @param id - The UUID returned from `store()`
	 * @returns The File object, or null if not found
	 */
	async retrieve({ dir, id }: { dir: string; id: string }): Promise<File | null> {
		assert(this._opfsRoot);

		try {
			const root = await this._getRoot(dir);
			const fileHandle = await root.getFileHandle(id);
			return await fileHandle.getFile();
		} catch {
			return null;
		}
	}

	/**
	 * Deletes a media file and its metadata from storage.
	 *
	 * @param id - The UUID of the file to delete
	 * @throws If the file does not exist
	 */
	async delete({ dir, id }: { dir: string; id: string }): Promise<void> {
		const root = await this._getRoot(dir);
		await Promise.all([root.removeEntry(id), root.removeEntry(id + META_SUFFIX)]);
	}

	/**
	 * Writes metadata to a sidecar JSON file.
	 *
	 * @param meta - The metadata object (must have an `id` property)
	 * @param dir - Optional subdirectory where metadata should be stored
	 */
	private async _writeMeta<T extends Record<string, unknown> & { id: string }>(
		meta: T,
		dir?: string
	): Promise<void> {
		assert(this._opfsRoot);

		const root = await this._getRoot(dir);
		const fileHandle = await root.getFileHandle(meta.id + META_SUFFIX, { create: true });
		const writable = await fileHandle.createWritable();
		await writable.write(JSON.stringify(meta));
		await writable.close();
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// JSON Document Operations
	// ─────────────────────────────────────────────────────────────────────────────

	/**
	 * Writes a JSON document to OPFS. Creates or overwrites the file.
	 *
	 * @param id - The filename (should end with `.json`)
	 * @param json - The object to serialize and store
	 * @param dir - Optional subdirectory
	 */
	async writeJSON<T extends Record<string, unknown>>({
		id,
		json,
		dir
	}: {
		id: string;
		json: T;
		dir?: string;
	}): Promise<void> {
		assert(this._opfsRoot);

		const root = await this._getRoot(dir);
		const fileHandle = await root.getFileHandle(id, { create: true });
		const writable = await fileHandle.createWritable();
		await writable.write(JSON.stringify(json));
		await writable.close();
	}

	/**
	 * Reads a JSON document from OPFS.
	 *
	 * @param id - The filename to read
	 * @param dir - Optional subdirectory
	 * @returns The parsed JSON, or null if not found or corrupted
	 */
	async readJSON<T extends Record<string, unknown>>({
		id,
		dir
	}: {
		id: string;
		dir?: string;
	}): Promise<T | null> {
		assert(this._opfsRoot);

		try {
			const root = await this._getRoot(dir);
			const fileHandle = await root.getFileHandle(id);
			const file = await fileHandle.getFile();
			return JSON.parse(await file.text()) as T;
		} catch {
			return null;
		}
	}

	/**
	 * Reads metadata from a sidecar JSON file.
	 *
	 * @param id - The file ID (without META_SUFFIX)
	 * @param dir - Optional subdirectory where metadata is stored
	 * @returns The metadata, or null if not found or corrupted
	 */
	public async readFileContentAsJSON<T extends Record<string, unknown> = FileMeta>(
		fileHandle: FileSystemFileHandle
	): Promise<T | null> {
		assert(this._opfsRoot);

		try {
			const file = await fileHandle.getFile();
			return JSON.parse(await file.text()) as T;
		} catch {
			return null;
		}
	}

	/**
	 * Deletes a JSON document from OPFS.
	 *
	 * @param id - The filename to delete
	 * @param dir - Optional subdirectory
	 * @throws If the file does not exist
	 */
	async deleteJSON({ id, dir }: { id: string; dir?: string }): Promise<void> {
		assert(this._opfsRoot);

		const root = await this._getRoot(dir);
		await root.removeEntry(id);
	}
}
