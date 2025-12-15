import type { Command } from "./command";

export class CommandHistory {
	private readonly _maxHistorySize = 16;
	private _undoStack: Command[] = [];
	private _redoStack: Command[] = [];

	constructor() {}

	public push(cmd: Command) {
		if (this._undoStack.length >= this._maxHistorySize) this._undoStack.shift();
		this._undoStack.push(cmd);
		this._redoStack = [];
	}

	public execute(cmd: Command) {
		cmd.execute();
		this.push(cmd);
	}

	public undo() {
		const cmd = this._undoStack.pop();
		if (!cmd) return;

		cmd.undo();
		this._redoStack.push(cmd);
	}

	public redo() {
		const cmd = this._redoStack.pop();
		if (!cmd) return;

		cmd.execute();
		this._undoStack.push(cmd);
	}

	get canUndo() {
		return this._undoStack.length > 0;
	}

	get canRedo() {
		return this._redoStack.length > 0;
	}
}
