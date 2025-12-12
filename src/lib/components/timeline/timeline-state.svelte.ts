import { Composition } from "$lib/editor/composition";
import type { BaseLayer } from "$lib/editor/layers";
import { getContext, setContext } from "svelte";
import { TARGET_TICK_WIDTH, TICK_INTERVALS, TICK_PADDING } from "./contants";

interface TimelineStateOptions {
	comp: Composition;
}

interface Tick {
	time: number;
	pos: number;
}

class TimelineState {
	private _comp: Composition;
	public scrollLeft = $state(0);
	public zoomFactor = $state(1);

	public viewportWidth = $state(0);

	public layers: BaseLayer[];
	public pps: number; // pixels per second

	public tickInterval: number;
	public startTickTime: number;
	public endTickTime: number;

	public mainTicks: Tick[];
	public subTicks: Tick[];

	constructor({ comp }: TimelineStateOptions) {
		this._comp = comp;
		this.layers = $derived(this._comp.layers);
		this.pps = $derived((this.viewportWidth / (this._comp.duration ?? 1)) * this.zoomFactor);

		this.tickInterval = $derived.by(() => {
			for (const int of TICK_INTERVALS) {
				if (int * this.pps >= TARGET_TICK_WIDTH) return int;
			}

			return TICK_INTERVALS.at(-1)!;
		});

		this.startTickTime = $derived.by(() => {
			const visibleStartTime = this.scrollLeft / this.pps;
			return Math.max(0, Math.floor(visibleStartTime / this.tickInterval) * this.tickInterval);
		});
		this.endTickTime = $derived.by(() => {
			const visibleEndTime = (this.scrollLeft + this.viewportWidth) / this.pps;
			return Math.ceil(visibleEndTime / this.tickInterval) * this.tickInterval;
		});

		this.mainTicks = $derived.by(() => this._getTicks(this.tickInterval));
		this.subTicks = $derived.by(() => this._getTicks(this.tickInterval / 4));
	}

	private _getTicks(interval: number) {
		const length = Math.ceil((this.endTickTime - this.startTickTime) / interval) + 1;
		if (isNaN(length) || length < 0) return []; // validations

		return [...Array(length).keys()].map((i) => {
			const time = i * interval + this.startTickTime;
			const pos = time * this.pps + TICK_PADDING - this.scrollLeft;
			return { time, pos };
		});
	}
}

const DEFAULT_KEY = "$_timeline_state";

export function getTimelineState(key = DEFAULT_KEY) {
	return getContext<TimelineState>(key);
}

export function setTimelineState(options: TimelineStateOptions, key = DEFAULT_KEY) {
	const timelineState = new TimelineState(options);
	return setContext(key, timelineState);
}
