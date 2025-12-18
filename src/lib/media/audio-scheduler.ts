import type { AudioBufferSink, WrappedAudioBuffer } from "mediabunny";

export class AudioScheduler {
	public isDisposed = false;

	private _audioGain: GainNode;
	private _audioCtx: AudioContext;
	private _audioSink: AudioBufferSink;
	private _audioSchedulerQueue: Set<AudioBufferSourceNode> = new Set();
	private _audioIterator: AsyncGenerator<WrappedAudioBuffer, void, unknown> | null = null;

	constructor(audioSink: AudioBufferSink, audioCtx: AudioContext) {
		this._audioSink = audioSink;
		this._audioCtx = audioCtx;

		this._audioGain = this._audioCtx.createGain();
		this._audioGain.connect(this._audioCtx.destination);
	}

	async start(time: number) {
		if (this.isDisposed) throw new Error("AudioScheduler has been disposed");
		if (this._audioSchedulerQueue.size > 0) throw new Error("AudioScheduler has been started");

		const anchor = this._audioCtx.currentTime; // anchor

		this._audioIterator = this._audioSink.buffers(time);
		for await (const sample of this._audioIterator) {
			const node = this._audioCtx.createBufferSource();
			node.buffer = sample.buffer;
			node.connect(this._audioGain);

			const startTimestamp = anchor + sample.timestamp - time;
			if (startTimestamp >= this._audioCtx.currentTime)
				// play the whole audio
				node.start(startTimestamp);
			else
				// play the remaining audio
				node.start(this._audioCtx.currentTime, this._audioCtx.currentTime - startTimestamp);

			this._audioSchedulerQueue.add(node);
			node.onended = () => {
				this._audioSchedulerQueue.delete(node);
			};

			// If we're more than a second ahead of the current playback time,
			// let's slow down the loop until time has passed.
			const currentTimestamp = anchor - this._audioCtx.currentTime + time;
			if (sample.timestamp - currentTimestamp > 1) {
				await new Promise<void>((resolve) => {
					const id = setInterval(() => {
						const now = this._audioCtx.currentTime - anchor + time;
						if (sample.timestamp - now < 1) {
							clearInterval(id);
							resolve();
						}
					}, 100);
				});
			}
		}
	}

	async stop() {
		if (this.isDisposed) throw new Error("AudioScheduler has been disposed");

		for (const node of this._audioSchedulerQueue) {
			node.stop();
			node.disconnect();
		}

		this._audioSchedulerQueue.clear();
		if (this._audioIterator) await this._audioIterator.return();
	}

	async dispose() {
		await this.stop();
		this._audioGain.disconnect();
		this.isDisposed = true;
	}

	setGain(val: number) {
		if (this.isDisposed) throw new Error("AudioScheduler has been disposed");
		if (val < 0 || val > 1) throw new Error("Gain value must be between 0 and 1");

		this._audioGain.gain.value = val;
	}
}
