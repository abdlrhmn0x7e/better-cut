import { assert } from "$lib/utils/assert";
import { getFileThumbnail } from "./thumbnail";
import type { FileMeta } from "./types";

const META_SUFFIX = ".metadata.json";

/**
 * Manages media file storage using the Origin Private File System (OPFS).
 *
 * Files are stored with a UUID as the filename, alongside a `.metadata.json`
 * sidecar file containing the original filename, MIME type, size, and thumbnail.
 *
 * @example
 * ```ts
 * const fileManager = await FileManager.init();
 *
 * // Store a file
 * const meta = await fileManager.store(file);
 * console.log(meta.id); // UUID to reference this file
 *
 * // Retrieve it later
 * const file = await fileManager.retrieve(meta.id);
 *
 * // List all stored files
 * const files = await fileManager.list();
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
	 * Lists all stored files with their metadata.
	 * @returns Array of file metadata (does not include the actual file data)
	 */
	async list(): Promise<FileMeta[]> {
		assert(this._opfsRoot);

		const list: FileMeta[] = [];
		for await (const [name, handle] of this._opfsRoot.entries()) {
			if (name.endsWith(META_SUFFIX)) continue;
			if (!(handle instanceof FileSystemFileHandle)) continue;

			const meta = await this._readMeta(name);
			if (meta) list.push(meta);
		}
		return list;
	}

	/**
	 * Stores a JSON in OPFS
	 *
	 * @param id - The id for the File object
	 * @param json - The JSON to store
	 */
	async storeJSON<T extends Record<string, unknown>>(id: string, json: T) {
		assert(this._opfsRoot);

		if (!id.endsWith(".json")) throw new Error("Suffix should not include .json extension");

		const fileHandle = await this._opfsRoot.getFileHandle(id, { create: true });
		const writable = await fileHandle.createWritable();
		await writable.write(JSON.stringify(json));
		await writable.close();
	}

	/**
	 * Overrides a JSON in OPFS
	 *
	 * @param id - The id for the File object
	 * @param json - The JSON to store
	 */
	async OverrideJSON<T extends Record<string, unknown>>(id: string, json: T) {
		assert(this._opfsRoot);

		if (!id.endsWith(".json")) throw new Error("Suffix should not include .json extension");

		const fileHandle = await this._opfsRoot.getFileHandle(id);
		const writable = await fileHandle.createWritable();
		await writable.write(JSON.stringify(json));
		await writable.close();
	}

	/**
	 * Reads JSON from a sidecar JSON file for a specific prefix.
	 * @returns The JSON, or null if not found or corrupted
	 */
	async retrieveJSON<T extends Record<string, unknown>>(
		id: string,
		suffix: string
	): Promise<T | null> {
		assert(this._opfsRoot);

		try {
			const fileHandle = await this._opfsRoot.getFileHandle(id + suffix);
			const file = await fileHandle.getFile();
			const json = JSON.parse(await file.text()) as T;
			return json;
		} catch {
			return null;
		}
	}

	/**
	 * Stores a file in OPFS and generates its metadata.
	 * File saving and thumbnail generation run in parallel.
	 *
	 * @param file - The File object to store
	 * @returns Metadata for the stored file, including its generated UUID
	 */
	async store(file: File): Promise<FileMeta> {
		const id = crypto.randomUUID();

		const saveFile = async () => {
			assert(this._opfsRoot);

			const fileHandle = await this._opfsRoot.getFileHandle(id, { create: true });
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
		await this._writeMeta(meta);

		return meta;
	}

	/**
	 * Writes metadata to a sidecar JSON file.
	 */
	private async _writeMeta(meta: FileMeta): Promise<void> {
		assert(this._opfsRoot);

		const fileHandle = await this._opfsRoot.getFileHandle(meta.id + META_SUFFIX, { create: true });
		const writable = await fileHandle.createWritable();
		await writable.write(JSON.stringify(meta));
		await writable.close();
	}

	/**
	 * Reads metadata from a sidecar JSON file.
	 * @returns The metadata, or null if not found or corrupted
	 */
	private async _readMeta(id: string): Promise<FileMeta | null> {
		assert(this._opfsRoot);

		try {
			const fileHandle = await this._opfsRoot.getFileHandle(id + META_SUFFIX);
			const file = await fileHandle.getFile();
			const meta = JSON.parse(await file.text());
			return meta;
		} catch {
			return null;
		}
	}

	/**
	 * Retrieves a stored file by its ID.
	 *
	 * @param id - The UUID returned from `store()`
	 * @returns The File object, or null if not found
	 */
	async retrieve(id: string): Promise<File | null> {
		assert(this._opfsRoot);

		try {
			const fileHandle = await this._opfsRoot.getFileHandle(id);
			const file = await fileHandle.getFile();
			return file;
		} catch {
			return null;
		}
	}

	/**
	 * Deletes a file and its metadata from storage.
	 *
	 * @param id - The UUID of the file to delete
	 * @throws If the file does not exist
	 */
	async delete(id: string): Promise<void> {
		assert(this._opfsRoot);
		await Promise.all([
			this._opfsRoot.removeEntry(id),
			this._opfsRoot.removeEntry(id + META_SUFFIX)
		]);
	}
}
