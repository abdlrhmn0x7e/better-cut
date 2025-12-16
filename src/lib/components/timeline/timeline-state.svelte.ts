import { getContext, setContext } from "svelte";
import { TARGET_TICK_WIDTH, TICK_INTERVALS, TICK_PADDING } from "./constants";
import { EditorState, getEditorState } from "$lib/editor";

class TimelineState {
	public selectedLayerId = $state<string | null>(null);
	public zoomFactor = $state(1);
	public viewportWidth = $state(0);
	private _editor: EditorState;

	private _scrollLeft = $state(0);

	constructor(editor: EditorState) {
		this._editor = editor;
	}

	get layers() {
		if (!this._editor.activeComposition) return [];
		return Array.from(this._editor.activeComposition.layers.values()); // this should be sorted later on
	}

	get pps() {
		return (this.viewportWidth / (this._editor.activeComposition?.duration ?? 1)) * this.zoomFactor;
	}

	get tickInterval() {
		for (const int of TICK_INTERVALS) {
			if (int * this.pps >= TARGET_TICK_WIDTH) return int;
		}
		return TICK_INTERVALS.at(-1)!;
	}

	get startTickTime() {
		const visibleStartTime = this._scrollLeft / this.pps;
		return Math.max(0, Math.floor(visibleStartTime / this.tickInterval) * this.tickInterval);
	}

	get endTickTime() {
		const visibleEndTime = (this._scrollLeft + this.viewportWidth) / this.pps;
		return Math.ceil(visibleEndTime / this.tickInterval) * this.tickInterval;
	}

	get mainTicks() {
		return this._getTicks(this.tickInterval);
	}

	get subTicks() {
		return this._getTicks(this.tickInterval / 4);
	}

	private get _maxScrollLeft() {
		const timelineWidth = (this._editor.activeComposition?.duration ?? 0) * this.pps;
		return Math.max(0, timelineWidth - this.viewportWidth + TICK_PADDING);
	}

	private _getTicks(interval: number) {
		const length = Math.ceil((this.endTickTime - this.startTickTime) / interval) + 1;
		if (isNaN(length) || length < 0) return []; // validations

		return [...Array(length).keys()].map((i) => {
			const time = i * interval + this.startTickTime;
			const pos = time * this.pps + TICK_PADDING - this._scrollLeft;
			return { time, pos };
		});
	}

	set scrollLeft(scroll: number) {
		this._scrollLeft = Math.min(Math.max(scroll, 0), this._maxScrollLeft);
	}

	get scrollLeft() {
		return this._scrollLeft;
	}
}

const DEFAULT_KEY = "$_timeline_state";

export function getTimelineState(key = DEFAULT_KEY) {
	return getContext<TimelineState>(key);
}

export function setTimelineState(key = DEFAULT_KEY) {
	const editor = getEditorState();
	const timelineState = new TimelineState(editor);
	return setContext(key, timelineState);
}
