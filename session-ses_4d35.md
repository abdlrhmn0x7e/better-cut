# Analyzing VideoLayer Composition Structure improvements

**Session ID:** ses_4d35db9e5ffeIWo6lrYpjtxcTn
**Created:** 12/17/2025, 4:06:30 PM
**Updated:** 12/17/2025, 8:25:06 PM

---

## User

I don't like the current architecture and compose of @src/lib/editor/layers/video.ts and @src/lib/editor/composition/composition.svelte.ts . I'm using a library called mediabunny here's the docs `https://mediabunny.dev/llms-full.txt`. can you explore the code and suggest improvments?

---

## Assistant

I'll fetch the mediabunny documentation to understand the library better, and then analyze your current code to suggest improvements.

```
Tool: webfetch
```

```
Tool: task
```

---

## Assistant

Now I have a comprehensive understanding of both your current architecture and the mediabunny library. Let me analyze your code and suggest improvements.

## Analysis & Improvement Suggestions

### Current Architecture Issues

After reviewing your code, I've identified several areas for improvement:

#### 1. **VideoLayer is doing too much**
Your `VideoLayer` class (~286 lines) handles:
- File retrieval
- Video probing
- Frame iteration management
- Canvas rendering
- Audio sink setup
- Audio scheduling and playback
- Frame rate conversion (up/downsampling)
- Serialization

This violates the Single Responsibility Principle and makes the code hard to maintain.

#### 2. **Manual iterator management is error-prone**
You're manually managing `AsyncGenerator` iterators for video frames and audio buffers. Mediabunny provides better abstractions via `CanvasSink` and `AudioBufferSink` that you're not fully leveraging.

#### 3. **Redundant probing**
You're using `probeVideo()` to get video metadata, but `mediabunny`'s `Input` API provides all this metadata via track objects (`InputVideoTrack`, `InputAudioTrack`).

#### 4. **Frame rate conversion complexity**
Your `_getAlignedTime()` and up/downsampling logic in `update()` is complex. Mediabunny's `CanvasSink` can handle this more elegantly with its timestamp-based iteration.

#### 5. **Composition couples tightly to VideoLayer**
In `composition.svelte.ts:102-111`, you're checking `instanceof VideoLayer` to draw. This breaks when you add `ImageLayer` or other visual layers.

#### 6. **Audio scheduling is tightly coupled**
The audio scheduling logic (`_scheduleAudio`, `_resetAudioSchedule`) is embedded in `VideoLayer` but could be extracted for reuse in `AudioLayer`.

---

### Proposed Architecture Improvements

Here's my suggested refactoring approach:

#### 1. **Introduce a Media Source abstraction**

Create a unified media source that wraps mediabunny's `Input` and provides tracks:

```typescript
// src/lib/media/media-source.ts
class MediaSource {
  private input: Input;
  private videoTrack: InputVideoTrack | null;
  private audioTrack: InputAudioTrack | null;
  
  static async fromFile(file: Blob | FileHandle): Promise<MediaSource>;
  
  get duration(): number;
  get hasVideo(): boolean;
  get hasAudio(): boolean;
  get videoInfo(): { width, height, fps, rotation };
  get audioInfo(): { channels, sampleRate };
  
  createVideoSink(options?: CanvasSinkOptions): CanvasSink;
  createAudioSink(): AudioBufferSink;
}
```

#### 2. **Split VideoLayer into concerns**

```
VideoLayer (orchestration only)
  ├── VideoRenderer (handles canvas/frame drawing)
  └── AudioScheduler (handles Web Audio API scheduling)
```

Or better yet, since mediabunny handles so much, create a thin adapter layer:

```typescript
// src/lib/editor/layers/video.ts
class VideoLayer extends BaseLayer {
  private mediaSource: MediaSource;
  private videoRenderer: VideoRenderer | null;
  private audioScheduler: AudioScheduler | null;
  
  // Much simpler lifecycle methods
  async onAttach() {
    if (this.mediaSource.hasVideo) {
      this.videoRenderer = new VideoRenderer(this.mediaSource, this._comp!);
    }
    if (this.mediaSource.hasAudio) {
      this.audioScheduler = new AudioScheduler(this.mediaSource, this._comp!.audioCtx);
    }
  }
}
```

#### 3. **Use CanvasSink's `canvasesAtTimestamps` for seeking**

Instead of manual iterator management:

```typescript
// Current approach (complex)
this._videoFrameIterator = await this._createVideoFrameIterator(startTime);
this._currentFrame = await this._getNextFrame();

// Better approach using mediabunny
const sink = new CanvasSink(videoTrack, { width, height });
const frame = await sink.getCanvas(layerTime);
```

#### 4. **Create a Drawable interface**

```typescript
interface Drawable {
  readonly canvas: OffscreenCanvas | HTMLCanvasElement | null;
  isVisible(time: number): boolean;
}

// Then in Composition
_tick({ anchor }) {
  for (const layer of this.layers.values()) {
    if ('canvas' in layer && (layer as Drawable).canvas) {
      this.draw(layer as Drawable);
    }
  }
}
```

#### 5. **Extract AudioScheduler as reusable component**

```typescript
// src/lib/media/audio-scheduler.ts
class AudioScheduler {
  constructor(audioSink: AudioBufferSink, audioCtx: AudioContext);
  
  async start(fromTime: number): Promise<void>;
  stop(): void;
  scheduleAhead(currentTime: number): Promise<void>;
  setVolume(gain: number): void;
}
```

---

### Questions for Clarification

Before I can provide a more detailed implementation plan, I have some questions:

1. **Playback priority**: Do you prioritize frame-accurate playback or smooth continuous playback? This affects how we handle frame rate conversion.

2. **Seeking behavior**: Should seeking be instant (show closest keyframe) or accurate (decode to exact frame)? Mediabunny supports both via `getCanvas(time)` vs `samplesAtTimestamps()`.

3. **Audio-video sync**: Are you having any issues with A/V sync? Your current approach of using `AudioContext.currentTime` as anchor is good, but the audio scheduling could be simplified.

4. **Multi-track support**: Do you plan to have multiple video layers composited together? This affects how we structure the rendering pipeline.

5. **Performance requirements**: What's your target - real-time preview at composition FPS, or is some frame dropping acceptable?

6. **Memory constraints**: Should we prioritize memory efficiency (stream frames) or responsiveness (cache frames around current time)?

Would you like me to proceed with a detailed implementation plan based on these suggestions, or would you prefer to clarify some of the questions first?

---

## User

1. frame accurate playback is important 2. seeking should show accurate frames 3. no it's working fine 4. each video layer handles 1 video only the composition happens through the composition class 5. frame dropping isn't acceptable 6. responsiveness comes first

---

## Assistant

Given your requirements (frame-accurate playback, accurate seeking, no frame dropping, responsiveness first), here's my refined analysis and proposed plan.

## Refined Architecture Plan

### Core Insight: Leverage Mediabunny More Fully

Your current code manually manages frame iterators and does frame-rate conversion yourself. Mediabunny's `CanvasSink` and `VideoSampleSink` already provide:
- Frame-accurate seeking via `getCanvas(timestamp)`
- Timestamp-based iteration via `canvases(start, end)`
- Automatic scaling/rotation via constructor options

The key change is to move from a **push-based iterator model** (you call `next()` each tick) to a **pull-based timestamp model** (you request the frame for a specific timestamp).

### Proposed File Structure

```
src/lib/
├── media/
│   ├── media-source.svelte.ts    # NEW: Wraps mediabunny Input per file
│   ├── audio-scheduler.ts        # NEW: Extracted Web Audio scheduling
│   └── ... (existing files)
├── editor/
│   ├── layers/
│   │   ├── base.svelte.ts        # Minor changes
│   │   ├── video.ts              # Major refactor (simplified)
│   │   ├── audio.ts              # Can now implement easily
│   │   └── ...
│   ├── composition/
│   │   ├── composition.svelte.ts # Minor changes (remove instanceof check)
│   │   ├── renderer.ts           # NEW: Handles canvas compositing
│   │   └── ...
```

---

## Detailed Plan

### Task 1: Create `MediaSource` wrapper class

**Purpose**: Encapsulate mediabunny's `Input`, `CanvasSink`, and `AudioBufferSink` into a single reusable class per media file.

**New file**: `src/lib/media/media-source.svelte.ts`

```typescript
// Conceptual structure
class MediaSource {
  // Factory pattern like VideoLayer.init()
  static async fromFileId(fileId: string, projectFilesDir: string): Promise<MediaSource>;
  
  // Properties (from mediabunny InputTrack metadata)
  readonly duration: number;
  readonly hasVideo: boolean;
  readonly hasAudio: boolean;
  readonly videoDimensions: { width: number; height: number } | null;
  readonly videoFps: number | null;
  readonly audioChannels: number | null;
  readonly audioSampleRate: number | null;
  
  // Sinks (lazy-created on first access)
  getVideoSink(): CanvasSink;  // reuses instance
  getAudioSink(): AudioBufferSink;  // reuses instance
  
  // Cleanup
  dispose(): void;
}
```

**Benefits**:
- Replaces your `probeVideo()` + manual `CanvasSink`/`AudioBufferSink` creation
- Single source of truth for media file metadata
- Lazy sink creation means no wasted resources

---

### Task 2: Extract `AudioScheduler` class

**Purpose**: Decouple Web Audio API scheduling from VideoLayer so it can be reused by AudioLayer.

**New file**: `src/lib/media/audio-scheduler.ts`

```typescript
class AudioScheduler {
  constructor(
    audioSink: AudioBufferSink,
    audioCtx: AudioContext,
    options?: { lookAheadSeconds?: number; gainValue?: number }
  );
  
  // Playback control
  async start(layerTime: number, anchorTime: number): Promise<void>;
  stop(): void;
  
  // Called from layer.update() to keep audio scheduled ahead
  async scheduleAhead(layerTime: number, anchorTime: number): Promise<void>;
  
  // Volume control
  setGain(value: number): void;
}
```

This extracts your current `_scheduleAudio`, `_resetAudioSchedule`, and `_audioNodesQueue` logic into a reusable class.

---

### Task 3: Refactor `VideoLayer`

**Purpose**: Simplify VideoLayer to ~100 lines by delegating to `MediaSource` and `AudioScheduler`.

**Key changes**:

| Current | Proposed |
|---------|----------|
| Manual `CanvasSink` creation in `_init()` | Use `MediaSource.getVideoSink()` |
| Manual `AudioBufferSink` creation in `onAttach()` | Use `MediaSource.getAudioSink()` |
| Audio scheduling logic (~60 lines) | Delegate to `AudioScheduler` |
| Frame iterator management | Use `CanvasSink.getCanvas(time)` for seeking, `canvases(start, end)` for playback |
| Frame rate conversion (up/downsampling) | Simplified using mediabunny's timestamp-based API |

**Critical decision point**: For playback, we have two approaches:

#### Option A: Per-frame `getCanvas()` calls (simple, slightly higher overhead)
```typescript
async update({ time }) {
  const layerTime = time - this.startOffset;
  const result = await this.videoSink.getCanvas(layerTime);
  if (result) {
    this._drawFrame(result.canvas);
  }
}
```

#### Option B: Iterator with buffering (current approach, more complex)
Keep using `canvases()` iterator but manage it more cleanly.

**My recommendation**: Start with **Option A** for simplicity. If profiling shows performance issues, we can optimize to Option B with a frame buffer/cache.

**Question for you**: Your current code does frame-rate conversion (e.g., 24fps video on 30fps composition). How should this behave?
- A) Always show the "current" frame (may show same frame twice)
- B) Interpolate (complex, probably not needed)
- C) Let mediabunny handle it (it already does with `getCanvas(time)`)

---

### Task 4: Introduce `Drawable` interface

**Purpose**: Allow Composition to draw any visual layer type without `instanceof` checks.

**Changes to** `src/lib/editor/layers/types.ts`:

```typescript
interface Drawable {
  readonly canvas: OffscreenCanvas | HTMLCanvasElement | null;
  readonly isVisible: boolean;  // or method isVisibleAt(time: number)
}
```

**Changes to** `VideoLayer` and future `ImageLayer`:
- Implement `Drawable` interface
- Add `isVisible` getter based on current time vs layer bounds

**Changes to** `Composition._tick()`:
```typescript
// Current (line 102-111)
this.layers.forEach(async (layer) => {
  await layer.update({ anchor, time: this.currentTimestamp });
  if (layer instanceof VideoLayer) {  // ❌ Bad
    this.draw(layer);
  }
});

// Proposed
for (const layer of this.layers.values()) {
  await layer.update({ anchor, time: this.currentTimestamp });
  if ('canvas' in layer && (layer as Drawable).isVisible) {
    this.drawDrawable(layer as Drawable);
  }
}
```

---

### Task 5: Minor Composition improvements

1. **Remove `async` from `forEach` callback** (line 102) - this is a subtle bug. Your current code doesn't actually await the layer updates sequentially; the `forEach` returns immediately. Either use:
   ```typescript
   for (const layer of this.layers.values()) {
     await layer.update(...);
   }
   ```
   Or if parallel is intended:
   ```typescript
   await Promise.all([...this.layers.values()].map(l => l.update(...)));
   ```

2. **Type-safe draw method**: Rename `draw(layer: VideoLayer)` to `drawDrawable(drawable: Drawable)` for generality.

---

### Task 6: Implement `AudioLayer` (optional, based on scope)

With `MediaSource` and `AudioScheduler` extracted, `AudioLayer` becomes trivial:

```typescript
class AudioLayer extends BaseLayer {
  private mediaSource: MediaSource;
  private audioScheduler: AudioScheduler | null = null;
  
  protected async onAttach() {
    this.audioScheduler = new AudioScheduler(
      this.mediaSource.getAudioSink(),
      this.audioCtx!
    );
  }
  
  async start({ time }) {
    await this.audioScheduler?.start(time - this.startOffset, this.audioCtx!.currentTime);
  }
  
  async update({ time, anchor }) {
    await this.audioScheduler?.scheduleAhead(time - this.startOffset, anchor);
  }
  
  async stop() {
    this.audioScheduler?.stop();
  }
}
```

---

## Implementation Order

I recommend this sequence:

1. **MediaSource** - foundation for everything else
2. **AudioScheduler** - extract from VideoLayer
3. **VideoLayer refactor** - use new abstractions
4. **Drawable interface** - clean up Composition
5. **Composition fixes** - async forEach bug, type-safe draw
6. **AudioLayer** - (optional) leverage new abstractions

---

## Questions Before Proceeding

1. **Frame rate handling**: For the up/downsampling question above, which option do you prefer (A, B, or C)?

2. **CanvasSink pooling**: Mediabunny's `CanvasSink` has a `poolSize` option for VRAM efficiency. Since you prioritize responsiveness, should we use a small pool (e.g., 2-3 canvases) or disable pooling?

3. **Scope of this refactor**: Should I include AudioLayer in this refactor, or focus solely on VideoLayer improvements?

4. **Backwards compatibility**: Your `VideoLayer.toJSON()` / `fromJSON()` serialization should stay compatible. Any concerns there?

Let me know your thoughts on these questions and I'll finalize the implementation plan!

---

## User

1. frame rate should be handled preferebly through mediabunny 2. disable pooling 3. focus solely on video layer 4. backward compatibility doesn't matter now this is an alpha

---

## Assistant

Perfect, those answers simplify the implementation significantly. Let me finalize the plan.

---

## Final Implementation Plan

### Goal
Refactor `VideoLayer` and `Composition` to better leverage mediabunny's APIs, resulting in cleaner, more maintainable code.

### Scope
- Create `MediaSource` wrapper class
- Extract `AudioScheduler` class  
- Refactor `VideoLayer` (~286 lines → ~120 lines)
- Fix Composition's async forEach bug and add `Drawable` interface
- AudioLayer is **out of scope**

---

### Task 1: Create `MediaSource` class

**New file**: `src/lib/media/media-source.ts`

**Purpose**: Wrap mediabunny's `Input` and provide lazy access to sinks and metadata.

**Structure**:
```typescript
import { Input, BlobSource, CanvasSink, AudioBufferSink, ALL_FORMATS } from 'mediabunny';
import { getFileManager } from './index';

export class MediaSource {
  private input: Input;
  private videoTrack: InputVideoTrack | null = null;
  private audioTrack: InputAudioTrack | null = null;
  
  // Cached sinks (lazy)
  private _videoSink: CanvasSink | null = null;
  private _audioSink: AudioBufferSink | null = null;

  private constructor(input: Input) { ... }

  static async fromFileId(fileId: string, projectFilesDir: string): Promise<MediaSource> {
    const fileManager = await getFileManager();
    const blob = await fileManager.retrieve({ id: fileId, dir: projectFilesDir });
    const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
    const source = new MediaSource(input);
    await source._init();
    return source;
  }

  private async _init() {
    this.videoTrack = await this.input.getPrimaryVideoTrack();
    this.audioTrack = await this.input.getPrimaryAudioTrack();
  }

  // Metadata getters
  get duration(): number;
  get hasVideo(): boolean;
  get hasAudio(): boolean;
  get videoDimensions(): { width: number; height: number } | null;
  get videoFps(): Promise<number> | null;  // via computePacketStats
  
  // Sink access (lazy, cached)
  getVideoSink(): CanvasSink {
    if (!this.videoTrack) throw new Error('No video track');
    if (!this._videoSink) {
      this._videoSink = new CanvasSink(this.videoTrack, { poolSize: 0 });
    }
    return this._videoSink;
  }

  getAudioSink(): AudioBufferSink {
    if (!this.audioTrack) throw new Error('No audio track');
    if (!this._audioSink) {
      this._audioSink = new AudioBufferSink(this.audioTrack);
    }
    return this._audioSink;
  }

  dispose() {
    this.input.dispose();
  }
}
```

**Updates to exports**: Add to `src/lib/media/index.ts`

---

### Task 2: Create `AudioScheduler` class

**New file**: `src/lib/media/audio-scheduler.ts`

**Purpose**: Encapsulate Web Audio API scheduling logic extracted from VideoLayer.

**Structure**:
```typescript
import type { AudioBufferSink, WrappedAudioBuffer } from 'mediabunny';

export class AudioScheduler {
  private audioSink: AudioBufferSink;
  private audioCtx: AudioContext;
  private gainNode: GainNode;
  
  private bufferIterator: AsyncGenerator<WrappedAudioBuffer> | null = null;
  private scheduledNodes: Set<AudioBufferSourceNode> = new Set();
  private lastScheduledTime = -1;
  private isScheduling = false;
  
  private readonly lookAheadSeconds: number;

  constructor(
    audioSink: AudioBufferSink,
    audioCtx: AudioContext,
    options?: { lookAheadSeconds?: number; gain?: number }
  ) {
    this.audioSink = audioSink;
    this.audioCtx = audioCtx;
    this.lookAheadSeconds = options?.lookAheadSeconds ?? 4;
    
    this.gainNode = audioCtx.createGain();
    this.gainNode.gain.value = options?.gain ?? 1;
    this.gainNode.connect(audioCtx.destination);
  }

  async start(layerTime: number): Promise<void> {
    this.stop(); // Clear any existing schedule
    if (layerTime < 0) return;
    
    this.bufferIterator = this.audioSink.buffers(layerTime);
    this.lastScheduledTime = layerTime;
  }

  stop(): void {
    for (const node of this.scheduledNodes) {
      node.stop();
      node.disconnect();
    }
    this.scheduledNodes.clear();
    this.bufferIterator?.return();
    this.bufferIterator = null;
    this.lastScheduledTime = -1;
  }

  async scheduleAhead(layerTime: number, anchorTime: number): Promise<void> {
    if (!this.bufferIterator || this.isScheduling) return;
    if (this.lastScheduledTime - layerTime >= 2) return; // Already scheduled enough
    
    this.isScheduling = true;
    // ... scheduling logic (similar to current _scheduleAudio)
    this.isScheduling = false;
  }

  setGain(value: number): void {
    this.gainNode.gain.value = value;
  }

  dispose(): void {
    this.stop();
    this.gainNode.disconnect();
  }
}
```

**Updates to exports**: Add to `src/lib/media/index.ts`

---

### Task 3: Add `Drawable` interface

**Update file**: `src/lib/editor/layers/types.ts`

**Add**:
```typescript
export interface Drawable {
  readonly canvas: OffscreenCanvas | HTMLCanvasElement | null;
  isVisibleAt(time: number): boolean;
}
```

---

### Task 4: Refactor `VideoLayer`

**Update file**: `src/lib/editor/layers/video.ts`

**Key changes**:

| Current Approach | New Approach |
|------------------|--------------|
| `probeVideo()` for metadata | `MediaSource` handles this |
| Manual `CanvasSink` creation | `MediaSource.getVideoSink()` |
| Manual `AudioBufferSink` creation | `MediaSource.getAudioSink()` |
| Frame iterator + `_getNextFrame()` | `CanvasSink.getCanvas(time)` for accurate frames |
| `_scheduleAudio()` (~35 lines) | `AudioScheduler.scheduleAhead()` |
| `_resetAudioSchedule()` (~7 lines) | `AudioScheduler.stop()` |
| Up/downsampling logic | Removed - mediabunny handles via timestamp |

**New structure** (~120 lines):

```typescript
import { MediaSource, AudioScheduler } from '$lib/media';
import type { WrappedCanvas } from 'mediabunny';
import { BaseLayer } from './base.svelte';
import type { Drawable, SerializedLayer, TimeOptions, VideoLayerOptions } from './types';

export class VideoLayer extends BaseLayer implements Drawable {
  public fileId: string;
  
  private mediaSource: MediaSource | null = null;
  private audioScheduler: AudioScheduler | null = null;
  private currentFrame: WrappedCanvas | null = null;

  public canvas: OffscreenCanvas | null = null;
  private canvasCtx: OffscreenCanvasRenderingContext2D | null = null;

  private constructor({ fileId, ...base }: VideoLayerOptions) {
    super({ ...base, type: 'video' });
    this.fileId = fileId;
  }

  static async init(options: VideoLayerOptions): Promise<VideoLayer> {
    const layer = new VideoLayer(options);
    await layer._init();
    return layer;
  }

  private async _init(): Promise<void> {
    this.mediaSource = await MediaSource.fromFileId(this.fileId, this.projectFilesDir);
    
    const dims = this.mediaSource.videoDimensions;
    if (!dims) throw new Error('No video track in media file');
    
    this.canvas = new OffscreenCanvas(dims.width, dims.height);
    this.canvasCtx = this.canvas.getContext('2d');
    this.endTime = this.mediaSource.duration;
  }

  // Drawable interface
  isVisibleAt(time: number): boolean {
    const layerTime = time - this.startOffset;
    return layerTime >= 0 && layerTime <= (this.endTime ?? 0);
  }

  protected async onAttach(): Promise<void> {
    if (this.mediaSource?.hasAudio && this.audioCtx) {
      this.audioScheduler = new AudioScheduler(
        this.mediaSource.getAudioSink(),
        this.audioCtx
      );
    }
  }

  protected async onDetach(): Promise<void> {
    this.audioScheduler?.dispose();
    this.audioScheduler = null;
  }

  async start({ time }: TimeOptions): Promise<void> {
    const layerTime = time - this.startOffset;
    if (layerTime < 0) return;

    // Get initial frame
    this.currentFrame = await this.mediaSource!.getVideoSink().getCanvas(layerTime);
    if (this.currentFrame) this.draw();

    // Start audio
    await this.audioScheduler?.start(layerTime);
  }

  async update({ anchor, time }: TimeOptions): Promise<void> {
    const layerTime = time - this.startOffset;
    
    if (!this.isVisibleAt(time)) {
      this.clear();
      return;
    }

    // Schedule audio ahead
    await this.audioScheduler?.scheduleAhead(layerTime, anchor + this.startOffset);

    // Get frame for current time
    const frame = await this.mediaSource!.getVideoSink().getCanvas(layerTime);
    if (frame && frame !== this.currentFrame) {
      this.currentFrame = frame;
      this.draw();
    }
  }

  async stop({ time }: TimeOptions): Promise<void> {
    this.audioScheduler?.stop();
    this.currentFrame = null;
    
    if (!this.isVisibleAt(time)) {
      this.clear();
    }
  }

  private draw(): void {
    if (!this.currentFrame || !this.canvas || !this.canvasCtx) return;
    
    const { canvas: frameCanvas } = this.currentFrame;
    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvasCtx.drawImage(frameCanvas, 0, 0);
  }

  clear(): void {
    if (!this.canvas || !this.canvasCtx) return;
    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  toJSON(): SerializedLayer {
    return {
      type: 'video',
      fileId: this.fileId,
      projectId: this.projectId,
      startOffset: this.startOffset
    };
  }

  static fromJSON(data: SerializedLayer): Promise<VideoLayer> {
    return VideoLayer.init(data);
  }
}
```

---

### Task 5: Update `Composition`

**Update file**: `src/lib/editor/composition/composition.svelte.ts`

**Changes**:

1. **Fix async forEach bug** (line 102-111):
```typescript
// Current (buggy - doesn't actually await)
this.layers.forEach(async (layer) => {
  await layer.update(...);
  if (layer instanceof VideoLayer) {
    this.draw(layer);
  }
});

// Fixed
for (const layer of this.layers.values()) {
  await layer.update({ anchor, time: this.currentTimestamp });
}

// Draw all drawable layers after updates complete
for (const layer of this.layers.values()) {
  if (this.isDrawable(layer) && layer.isVisibleAt(this.currentTimestamp)) {
    this.drawDrawable(layer);
  }
}
```

2. **Add type guard and generic draw method**:
```typescript
import type { Drawable } from '../layers/types';

// Type guard
private isDrawable(layer: BaseLayer): layer is BaseLayer & Drawable {
  return 'canvas' in layer && 'isVisibleAt' in layer;
}

// Generic draw (replaces draw(layer: VideoLayer))
private drawDrawable(drawable: Drawable): void {
  if (!drawable.canvas || !this._canvasCtx) return;
  this._canvasCtx.drawImage(
    drawable.canvas, 
    0, 0, 
    drawable.canvas.width, 
    drawable.canvas.height
  );
}
```

3. **Remove VideoLayer import** (if no longer needed elsewhere in the file)

---

### Task 6: Update exports

**Update file**: `src/lib/media/index.ts`
- Export `MediaSource`
- Export `AudioScheduler`

**Update file**: `src/lib/editor/layers/index.ts`
- Ensure `Drawable` type is exported from types

---

## Summary of Changes

| File | Action | Lines (approx) |
|------|--------|----------------|
| `src/lib/media/media-source.ts` | Create | ~80 |
| `src/lib/media/audio-scheduler.ts` | Create | ~90 |
| `src/lib/media/index.ts` | Update | +2 |
| `src/lib/editor/layers/types.ts` | Update | +5 |
| `src/lib/editor/layers/video.ts` | Refactor | 286 → ~120 |
| `src/lib/editor/composition/composition.svelte.ts` | Update | ~20 lines changed |

**Net result**: ~170 new lines in extracted classes, ~166 lines removed from VideoLayer, cleaner architecture.

---

## Potential Concerns

1. **Performance of `getCanvas()` per frame**: Mediabunny's `getCanvas(time)` involves seeking, which could be slower than iterating. However, for continuous playback, mediabunny internally optimizes sequential access. If we see issues, we can revisit with a buffering strategy.

2. **CanvasSink caching**: With `poolSize: 0`, each `getCanvas()` returns a fresh canvas. This is fine for responsiveness but uses more VRAM. If memory becomes an issue later, we can revisit.

3. **Audio iterator lifetime**: The `AudioScheduler.start()` creates a new iterator each time. This is correct behavior for seeking but we need to ensure proper cleanup.

---

Does this plan look good to you? Any concerns or adjustments before I proceed with implementation?

---

## User

is it a good idea to drop the start and stop method and replace update with a fetch method that takes a timestamp and returns a canvas for the comp to draw?

---

## Assistant

That's a great architectural question. Let me think through the tradeoffs.

## Analysis: Dropping `start`/`stop` in favor of `fetch(timestamp): Canvas`

### Current Model (Stateful)
```typescript
layer.start({ time })   // Initialize iterators, schedule audio
layer.update({ time })  // Advance frame, schedule more audio
layer.stop({ time })    // Cleanup iterators, stop audio
```

### Proposed Model (Stateless for video, stateful for audio)
```typescript
layer.fetch(timestamp): OffscreenCanvas | null  // Just return the frame
```

---

## Advantages of `fetch()` approach

1. **Simpler mental model**: Layer becomes a pure function of time → canvas. No lifecycle to manage for video rendering.

2. **Seeking becomes trivial**: No need to stop/restart iterators. Just call `fetch(newTime)`.

3. **Composition has full control**: The composition decides when to draw, layers just provide data.

4. **Easier testing**: Stateless functions are easier to unit test.

5. **Better separation of concerns**: Video rendering is decoupled from playback lifecycle.

---

## The Problem: Audio

Audio is inherently stateful and time-sensitive:
- You need to **schedule buffers ahead** of playback
- You need to **stop scheduled nodes** when pausing
- Audio timing is tied to `AudioContext.currentTime`, not arbitrary timestamps

So `fetch()` doesn't work cleanly for audio. You'd need something like:

```typescript
interface VideoLayer {
  fetch(timestamp: number): OffscreenCanvas | null;  // Stateless
  
  // Audio still needs lifecycle
  startAudio(timestamp: number, anchor: number): void;
  stopAudio(): void;
  scheduleAudioAhead(timestamp: number, anchor: number): void;
}
```

This creates an awkward split API.

---

## Alternative: Keep lifecycle but simplify it

What if we keep `start`/`stop` but make them **only about audio**, and make video fetching stateless?

```typescript
interface Layer {
  // Video: stateless fetch
  getFrame(timestamp: number): OffscreenCanvas | null;
  isVisibleAt(timestamp: number): boolean;
  
  // Audio: stateful lifecycle (only called if layer has audio)
  startAudio?(anchor: number, layerTime: number): void;
  stopAudio?(): void;
  tickAudio?(anchor: number, layerTime: number): void;
}
```

Then `Composition._tick()` becomes:

```typescript
_tick({ anchor }) {
  const time = this.audioCtx.currentTime - anchor;
  
  // Stateless video fetching
  for (const layer of this.layers.values()) {
    if (layer.isVisibleAt(time)) {
      const frame = layer.getFrame(time);
      if (frame) this.drawCanvas(frame);
    }
    
    // Stateful audio scheduling
    layer.tickAudio?.(anchor, time - layer.startOffset);
  }
  
  requestAnimationFrame(() => this._tick({ anchor }));
}
```

---

## My Recommendation

**Yes, drop `start`/`stop`/`update` for video, but extract audio handling separately.**

The cleanest approach:

| Concern | API | Owner |
|---------|-----|-------|
| Video frames | `getFrame(time): Canvas \| null` | `VideoLayer` |
| Visibility | `isVisibleAt(time): boolean` | `VideoLayer` |
| Audio playback | Lifecycle methods | `AudioScheduler` (owned by Composition or Layer) |

This means:
- `VideoLayer` becomes nearly stateless (just wraps `MediaSource`)
- Audio scheduling could move **up to Composition** or stay as an optional component in layers

---

## Question for you

Where should audio scheduling live?

**Option A**: Layer owns its audio
```typescript
class VideoLayer {
  private audioScheduler?: AudioScheduler;
  
  getFrame(time: number): OffscreenCanvas | null;
  
  // Composition calls these
  onPlay(anchor: number, time: number): void { this.audioScheduler?.start(...); }
  onPause(): void { this.audioScheduler?.stop(); }
  onTick(anchor: number, time: number): void { this.audioScheduler?.scheduleAhead(...); }
}
```

**Option B**: Composition manages all audio
```typescript
class Composition {
  private audioSchedulers = new Map<string, AudioScheduler>();
  
  insertLayer(layer) {
    if (layer.hasAudio) {
      this.audioSchedulers.set(layer.id, new AudioScheduler(layer.getAudioSink(), this.audioCtx));
    }
  }
  
  _tick() {
    // Handle all audio centrally
    for (const [id, scheduler] of this.audioSchedulers) {
      scheduler.scheduleAhead(...);
    }
  }
}
```

**Option A** keeps audio close to its source (better encapsulation).  
**Option B** gives Composition full control (easier to manage global audio state, muting, mixing).

Which feels right for your use case?

---

## User

option A muting and mixing happens on a layer level not a comp level

---

## Assistant

Good choice. Layer-level audio control makes sense for a video editor where each clip has its own volume, effects, etc.

---

## Final Architecture

### Layer Interface

```typescript
interface Layer {
  // Identity
  readonly id: string;
  readonly startOffset: number;
  
  // Video (stateless)
  getFrame(timestamp: number): OffscreenCanvas | null;
  isVisibleAt(timestamp: number): boolean;
  
  // Audio lifecycle (layer owns its audio)
  onPlay(anchor: number, layerTime: number): void;
  onPause(): void;
  onTick(anchor: number, layerTime: number): void;
  
  // Cleanup
  dispose(): void;
}
```

### VideoLayer (simplified)

```typescript
class VideoLayer extends BaseLayer implements Drawable {
  private mediaSource: MediaSource;
  private audioScheduler: AudioScheduler | null;
  
  // Stateless video
  getFrame(timestamp: number): OffscreenCanvas | null {
    const layerTime = timestamp - this.startOffset;
    if (!this.isVisibleAt(timestamp)) return null;
    return this.mediaSource.getVideoSink().getCanvas(layerTime)?.canvas ?? null;
  }
  
  isVisibleAt(timestamp: number): boolean {
    const layerTime = timestamp - this.startOffset;
    return layerTime >= 0 && layerTime <= this.duration;
  }
  
  // Audio lifecycle
  onPlay(anchor: number, layerTime: number): void {
    this.audioScheduler?.start(layerTime);
  }
  
  onPause(): void {
    this.audioScheduler?.stop();
  }
  
  onTick(anchor: number, layerTime: number): void {
    this.audioScheduler?.scheduleAhead(layerTime, anchor);
  }
  
  // Volume control at layer level
  setVolume(value: number): void {
    this.audioScheduler?.setGain(value);
  }
}
```

### Composition (simplified)

```typescript
class Composition {
  start() {
    const anchor = this.audioCtx.currentTime - this.currentTimestamp;
    
    for (const layer of this.layers.values()) {
      const layerTime = this.currentTimestamp - layer.startOffset;
      layer.onPlay(anchor, layerTime);
    }
    
    this.playing = true;
    requestAnimationFrame(() => this._tick({ anchor }));
  }
  
  stop() {
    for (const layer of this.layers.values()) {
      layer.onPause();
    }
    this.playing = false;
  }
  
  _tick({ anchor }: { anchor: number }) {
    if (!this.playing) return;
    
    this.currentTimestamp = this.audioCtx.currentTime - anchor;
    this._canvasCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    
    for (const layer of this.layers.values()) {
      const layerTime = this.currentTimestamp - layer.startOffset;
      
      // Audio tick
      layer.onTick(anchor + layer.startOffset, layerTime);
      
      // Video fetch (stateless)
      if (layer.isVisibleAt(this.currentTimestamp)) {
        const frame = layer.getFrame(this.currentTimestamp);
        if (frame) this.drawCanvas(frame);
      }
    }
    
    requestAnimationFrame(() => this._tick({ anchor }));
  }
  
  seek(time: number) {
    // Much simpler now - no stop/start dance
    this.currentTimestamp = time;
    
    // Just redraw
    this._canvasCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    for (const layer of this.layers.values()) {
      if (layer.isVisibleAt(time)) {
        const frame = layer.getFrame(time);
        if (frame) this.drawCanvas(frame);
      }
    }
    
    // If playing, restart audio from new position
    if (this.playing) {
      const anchor = this.audioCtx.currentTime - time;
      for (const layer of this.layers.values()) {
        layer.onPause();
        layer.onPlay(anchor, time - layer.startOffset);
      }
    }
  }
}
```

---

## Summary of Final Plan

| File | Action | Description |
|------|--------|-------------|
| `src/lib/media/media-source.ts` | **Create** | Wraps mediabunny `Input`, provides lazy sinks and metadata |
| `src/lib/media/audio-scheduler.ts` | **Create** | Extracted audio scheduling with `start`, `stop`, `scheduleAhead`, `setGain` |
| `src/lib/media/index.ts` | **Update** | Export new classes |
| `src/lib/editor/layers/types.ts` | **Update** | Add `Drawable` interface, update method signatures |
| `src/lib/editor/layers/base.svelte.ts` | **Update** | Change abstract methods: remove `start`/`stop`/`update`, add `getFrame`/`isVisibleAt`/`onPlay`/`onPause`/`onTick` |
| `src/lib/editor/layers/video.ts` | **Refactor** | Use `MediaSource`, `AudioScheduler`, implement new interface |
| `src/lib/editor/composition/composition.svelte.ts` | **Update** | Simplify `_tick`, `seek`, remove `instanceof` checks, use new layer API |

---

## One Last Question

For `getFrame()`, should it be:

**A) Sync** (returns cached frame, background prefetch)
```typescript
getFrame(timestamp: number): OffscreenCanvas | null
```
Pros: Non-blocking tick loop, smoother animation
Cons: May show stale frame briefly on seek

**B) Async** (always waits for correct frame)
```typescript
getFrame(timestamp: number): Promise<OffscreenCanvas | null>
```
Pros: Always accurate
Cons: `_tick` becomes async, potential frame drops if decode is slow

Given your "frame accuracy > everything" requirement, I'm leaning toward **B (async)**, but wanted to confirm. Mediabunny's `getCanvas()` is async anyway, so we'd need to handle it either way.

---

## User

I think getFrame should be sync with a prefetching mechanism and invalidations for cache when something change? what do you think

---

## Assistant

Great thinking. A sync `getFrame()` with prefetching is the right approach for smooth playback while maintaining accuracy. Let me think through the design.

---

## Prefetching Design

### Core Idea

```typescript
class VideoLayer {
  private frameCache: Map<number, OffscreenCanvas>;  // timestamp → canvas
  private prefetchRange = { behind: 0.5, ahead: 2 };  // seconds
  
  // Sync - returns from cache
  getFrame(timestamp: number): OffscreenCanvas | null {
    const layerTime = timestamp - this.startOffset;
    const alignedTime = this.alignToFrameGrid(layerTime);
    return this.frameCache.get(alignedTime) ?? null;
  }
  
  // Called during onTick - prefetches frames around current time
  prefetch(currentTime: number): void {
    const layerTime = currentTime - this.startOffset;
    const start = layerTime - this.prefetchRange.behind;
    const end = layerTime + this.prefetchRange.ahead;
    
    // Background fetch frames in range, populate cache
    this.fetchFramesInRange(start, end);
    
    // Evict frames outside range
    this.evictOutsideRange(start, end);
  }
}
```

### Cache Invalidation Triggers

| Event | Action |
|-------|--------|
| Seek to new position | Clear cache, prefetch around new position |
| Layer `startOffset` changes | Clear cache (all timestamps shift) |
| Layer trim (`startTime`/`endTime` changes) | Clear affected frames |
| Composition FPS changes | Clear cache (frame grid changes) |

---

## Considerations

### 1. Frame Alignment

Since video has its own FPS and composition has a target FPS, we need to align timestamps to a grid:

```typescript
// If video is 24fps and comp is 30fps, we need to map comp timestamps to video frames
alignToFrameGrid(layerTime: number): number {
  const videoFps = this.mediaSource.videoFps;
  return Math.floor(layerTime * videoFps) / videoFps;
}
```

This ensures cache keys are consistent and we don't cache the same frame under multiple keys.

### 2. Prefetch Strategy

**Option A: Range-based iterator**
```typescript
// Use mediabunny's canvases(start, end) iterator
async prefetch(start: number, end: number) {
  for await (const frame of this.videoSink.canvases(start, end)) {
    const aligned = this.alignToFrameGrid(frame.timestamp);
    if (!this.frameCache.has(aligned)) {
      this.frameCache.set(aligned, frame.canvas);
    }
  }
}
```

**Option B: Individual getCanvas calls**
```typescript
async prefetch(start: number, end: number) {
  const frameDuration = 1 / this.mediaSource.videoFps;
  for (let t = start; t <= end; t += frameDuration) {
    if (!this.frameCache.has(t)) {
      const frame = await this.videoSink.getCanvas(t);
      if (frame) this.frameCache.set(t, frame.canvas);
    }
  }
}
```

Option A is likely more efficient since mediabunny can optimize sequential decoding.

### 3. Cache Size Limits

With no pooling and responsiveness priority, we might cache a lot of frames. At 1080p, each frame is ~8MB (RGBA). 2 seconds at 30fps = 60 frames = 480MB per layer.

Options:
- **LRU eviction**: Keep N most recent frames
- **Time-window eviction**: Only keep frames within ±X seconds of current time
- **Hybrid**: Time-window with max frame count

Given "responsiveness first", I'd suggest **time-window eviction** (simpler, predictable memory usage).

### 4. Handling Cache Misses

If `getFrame()` returns `null` (cache miss), what should Composition do?

**Option A**: Show nothing (blank)
**Option B**: Show last known frame (stale)
**Option C**: Block and wait (defeats sync purpose)

I'd suggest **Option B** for smoother UX - keep a `lastValidFrame` reference and return that on cache miss. This handles edge cases like rapid seeking.

---

## Updated Interface

```typescript
class VideoLayer extends BaseLayer implements Drawable {
  private mediaSource: MediaSource;
  private audioScheduler: AudioScheduler | null;
  
  // Frame cache
  private frameCache = new Map<number, OffscreenCanvas>();
  private lastValidFrame: OffscreenCanvas | null = null;
  private prefetchAhead = 2;  // seconds
  private prefetchBehind = 0.5;  // seconds
  private isPrefetching = false;
  
  // Sync - returns from cache or last valid frame
  getFrame(timestamp: number): OffscreenCanvas | null {
    const layerTime = timestamp - this.startOffset;
    const aligned = this.alignToFrameGrid(layerTime);
    
    const cached = this.frameCache.get(aligned);
    if (cached) {
      this.lastValidFrame = cached;
      return cached;
    }
    
    return this.lastValidFrame;  // Fallback to avoid flicker
  }
  
  // Called during onTick
  onTick(anchor: number, layerTime: number): void {
    this.audioScheduler?.scheduleAhead(layerTime, anchor);
    this.prefetch(layerTime);
  }
  
  // Background prefetch (non-blocking)
  private prefetch(currentLayerTime: number): void {
    if (this.isPrefetching) return;
    
    const start = Math.max(0, currentLayerTime - this.prefetchBehind);
    const end = Math.min(this.duration, currentLayerTime + this.prefetchAhead);
    
    this.isPrefetching = true;
    this.fetchFramesInRange(start, end)
      .then(() => this.evictOutsideRange(start - 1, end + 1))
      .finally(() => { this.isPrefetching = false; });
  }
  
  // Cache invalidation
  invalidateCache(): void {
    this.frameCache.clear();
    this.lastValidFrame = null;
  }
  
  // Called when startOffset changes (e.g., layer moved on timeline)
  onStartOffsetChange(): void {
    this.invalidateCache();
  }
}
```

---

## Questions

1. **Prefetch window**: Is 2 seconds ahead / 0.5 seconds behind reasonable? Or should this be configurable per layer?

2. **Cache miss behavior**: Return last valid frame (Option B above) or return null and let Composition decide?

3. **Memory budget**: Any hard limit you want to impose? Or trust time-window eviction to keep it reasonable?

4. **Invalidation hooks**: Should the layer observe its own property changes (via Svelte runes) to auto-invalidate, or should the command system explicitly call `invalidateCache()` after mutations?

---

## User

wait 2 seconds at full hd res and 30 fps is 480mb per layer?? this is a lot 8mb for one canvas? how does big editors like after effects handle this. I've used it a ton and it has per composition level caching

---

## Assistant

You're absolutely right to question this. Let me recalculate and research how professional editors handle this.

## Memory Reality Check

### Actual Canvas Memory

```
1920 × 1080 × 4 bytes (RGBA) = 8,294,400 bytes ≈ 8MB per frame
30 fps × 2 seconds = 60 frames
60 × 8MB = 480MB per layer
```

Yes, that math is correct. This is **way too much** for a browser-based editor.

### How After Effects Handles This

After Effects uses a **composition-level RAM cache** with these strategies:

1. **Rendered frame cache, not source frame cache**: It caches the *composited output* at the composition level, not individual layer frames. One cache serves all layers.

2. **Resolution proxies**: Preview at 1/2, 1/4, or 1/8 resolution. 480p preview = ~1.2MB/frame instead of 8MB.

3. **Disk cache**: Frames spill to disk (SSD) when RAM is full. Browser can't do this easily.

4. **Selective caching**: Only cache around the playhead + recently accessed regions.

5. **Cache on pause**: Full-res frames are rendered/cached when you stop, not during playback.

6. **Green/blue bar indicator**: Shows which frames are cached (green = RAM, blue = disk).

---

## Better Approach for Browser

Given browser memory constraints, here's what makes sense:

### Option 1: Composition-level cache (like AE)

```typescript
class Composition {
  private frameCache = new Map<number, OffscreenCanvas>();  // timestamp → composited frame
  
  _tick() {
    const cached = this.frameCache.get(this.currentTimestamp);
    if (cached) {
      this.drawCached(cached);
      return;
    }
    
    // Compose all layers into one frame, cache it
    const composited = this.composeFrame(this.currentTimestamp);
    this.frameCache.set(this.currentTimestamp, composited);
    this.drawCached(composited);
  }
}
```

**Pros**: One cache for entire composition, much smaller memory footprint
**Cons**: Any layer change invalidates frames that include that layer

### Option 2: No caching, rely on mediabunny's decoding

Mediabunny already handles efficient seeking and frame extraction. Instead of caching, we:

1. Keep `getFrame()` async
2. Use `requestAnimationFrame` timing to skip frames if decode is slow
3. Trust the browser/mediabunny to handle the heavy lifting

```typescript
async _tick() {
  const startTime = performance.now();
  
  for (const layer of this.layers.values()) {
    const frame = await layer.getFrame(this.currentTimestamp);  // async, no cache
    if (frame) this.drawCanvas(frame);
  }
  
  // If this tick took too long, we naturally drop to next rAF
}
```

**Pros**: Zero memory overhead, simple
**Cons**: May drop frames on slow devices

### Option 3: Hybrid - small temporal window + preview resolution

```typescript
class VideoLayer {
  private frameCache = new Map<number, OffscreenCanvas>();
  private maxCachedFrames = 10;  // Only ~80MB at 1080p
  private previewScale = 0.5;    // 540p during playback = ~2MB/frame
  
  getFrame(timestamp: number, quality: 'preview' | 'full'): OffscreenCanvas | null {
    // During playback: use preview resolution
    // During pause/export: use full resolution
  }
}
```

**Pros**: Balances memory and responsiveness
**Cons**: More complexity

---

## My Recommendation

**Start with Option 2 (no caching)** and see how mediabunny performs. The library is likely already optimized for sequential frame access. 

If performance is an issue, add **Option 3 (small cache + preview resolution)** as an optimization.

If you want AE-style caching later, **Option 1 (composition-level)** makes the most sense since:
- One cache regardless of layer count
- Users expect timeline cache indicator (green bar)
- Invalidation is clearer (layer change = clear affected range)

---

## Questions

1. **Have you experienced performance issues with the current iterator approach?** If not, maybe caching is premature optimization.

2. **Would preview resolution during playback be acceptable?** (full res on pause/export)

3. **Do you want to pursue composition-level caching like AE?** This would be a bigger architectural change but more scalable.

---

## User

I'll add opfs disk based caching later on so lets staaart with no caching. 1. no 2. I'd like the user to choose a res 3. yes but later on

---

## Assistant

Perfect, that simplifies things significantly. Let's finalize the plan.

---

## Final Architecture (No Caching, Async getFrame)

### Summary

- **No frame caching** - rely on mediabunny's decoding
- **Async `getFrame()`** - simple, accurate
- **User-configurable preview resolution** - passed to `CanvasSink`
- **Composition-level caching** - deferred to later
- **OPFS disk cache** - deferred to later

---

## Final Implementation Plan

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/media/media-source.ts` | Wraps mediabunny `Input`, provides sinks and metadata |
| `src/lib/media/audio-scheduler.ts` | Extracted audio scheduling logic |

### Files to Update

| File | Changes |
|------|---------|
| `src/lib/media/index.ts` | Export new classes |
| `src/lib/editor/layers/types.ts` | Add `Drawable` interface, new method signatures |
| `src/lib/editor/layers/base.svelte.ts` | New abstract methods: `getFrame`, `isVisibleAt`, `onPlay`, `onPause`, `onTick`, `dispose` |
| `src/lib/editor/layers/video.ts` | Major refactor using new architecture |
| `src/lib/editor/composition/composition.svelte.ts` | Simplified tick/seek, use new layer API |

### Files to Delete

| File | Reason |
|------|--------|
| `src/lib/media/probe.ts` | Replaced by `MediaSource` metadata |

---

## Detailed Specification

### 1. `MediaSource` (`src/lib/media/media-source.ts`)

```typescript
import { Input, BlobSource, CanvasSink, AudioBufferSink, ALL_FORMATS } from 'mediabunny';
import type { InputVideoTrack, InputAudioTrack } from 'mediabunny';
import { getFileManager } from './index';

export interface MediaSourceOptions {
  fileId: string;
  projectFilesDir: string;
}

export interface VideoSinkOptions {
  width?: number;
  height?: number;
}

export class MediaSource {
  private input: Input;
  private videoTrack: InputVideoTrack | null = null;
  private audioTrack: InputAudioTrack | null = null;
  private _videoSink: CanvasSink | null = null;
  private _audioSink: AudioBufferSink | null = null;
  private videoSinkOptions: VideoSinkOptions = {};

  private constructor(input: Input) { /* ... */ }

  static async create(options: MediaSourceOptions): Promise<MediaSource>;

  // Metadata
  get duration(): number;
  get hasVideo(): boolean;
  get hasAudio(): boolean;
  get videoDimensions(): { width: number; height: number } | null;
  get videoFps(): number | null;

  // Sinks (lazy, cached)
  getVideoSink(options?: VideoSinkOptions): CanvasSink;
  getAudioSink(): AudioBufferSink;
  
  // Resolution change (invalidates video sink)
  setVideoSinkOptions(options: VideoSinkOptions): void;

  dispose(): void;
}
```

### 2. `AudioScheduler` (`src/lib/media/audio-scheduler.ts`)

```typescript
import type { AudioBufferSink, WrappedAudioBuffer } from 'mediabunny';

export interface AudioSchedulerOptions {
  lookAheadSeconds?: number;
  gain?: number;
}

export class AudioScheduler {
  constructor(
    audioSink: AudioBufferSink,
    audioCtx: AudioContext,
    options?: AudioSchedulerOptions
  );

  start(layerTime: number): Promise<void>;
  stop(): void;
  scheduleAhead(layerTime: number, anchorTime: number): Promise<void>;
  setGain(value: number): void;
  dispose(): void;
}
```

### 3. Updated `types.ts` (`src/lib/editor/layers/types.ts`)

```typescript
// Add Drawable interface
export interface Drawable {
  getFrame(timestamp: number): Promise<OffscreenCanvas | null>;
  isVisibleAt(timestamp: number): boolean;
}

// Simplified - remove TimeOptions, add new options
export interface PlayOptions {
  anchor: number;
  time: number;
}
```

### 4. Updated `BaseLayer` (`src/lib/editor/layers/base.svelte.ts`)

```typescript
export abstract class BaseLayer {
  // Existing properties remain
  
  // Remove these abstract methods:
  // - update()
  // - start()
  // - stop()
  
  // Add these abstract methods:
  abstract getFrame(timestamp: number): Promise<OffscreenCanvas | null>;
  abstract isVisibleAt(timestamp: number): boolean;
  abstract onPlay(anchor: number, time: number): Promise<void>;
  abstract onPause(): void;
  abstract onTick(anchor: number, time: number): Promise<void>;
  abstract dispose(): void;
}
```

### 5. Refactored `VideoLayer` (`src/lib/editor/layers/video.ts`)

```typescript
import { MediaSource, AudioScheduler } from '$lib/media';
import { BaseLayer } from './base.svelte';
import type { Drawable, SerializedLayer, VideoLayerOptions } from './types';

export class VideoLayer extends BaseLayer implements Drawable {
  public readonly fileId: string;
  
  private mediaSource: MediaSource | null = null;
  private audioScheduler: AudioScheduler | null = null;

  private constructor(options: VideoLayerOptions) { /* ... */ }
  
  static async create(options: VideoLayerOptions): Promise<VideoLayer>;

  // Drawable implementation
  async getFrame(timestamp: number): Promise<OffscreenCanvas | null> {
    const layerTime = timestamp - this.startOffset;
    if (!this.isVisibleAt(timestamp)) return null;
    
    const sink = this.mediaSource!.getVideoSink();
    const result = await sink.getCanvas(layerTime);
    return result?.canvas ?? null;
  }

  isVisibleAt(timestamp: number): boolean {
    const layerTime = timestamp - this.startOffset;
    return layerTime >= 0 && layerTime <= (this.endTime ?? 0);
  }

  // Audio lifecycle
  async onPlay(anchor: number, time: number): Promise<void> {
    const layerTime = time - this.startOffset;
    if (layerTime >= 0) {
      await this.audioScheduler?.start(layerTime);
    }
  }

  onPause(): void {
    this.audioScheduler?.stop();
  }

  async onTick(anchor: number, time: number): Promise<void> {
    const layerTime = time - this.startOffset;
    await this.audioScheduler?.scheduleAhead(layerTime, anchor + this.startOffset);
  }

  // Volume control
  setVolume(value: number): void {
    this.audioScheduler?.setGain(value);
  }

  // Resolution control
  setPreviewResolution(width: number, height: number): void {
    this.mediaSource?.setVideoSinkOptions({ width, height });
  }

  // Lifecycle
  protected async onAttach(): Promise<void> {
    if (this.mediaSource?.hasAudio && this.audioCtx) {
      this.audioScheduler = new AudioScheduler(
        this.mediaSource.getAudioSink(),
        this.audioCtx
      );
    }
  }

  protected async onDetach(): Promise<void> {
    this.audioScheduler?.dispose();
    this.audioScheduler = null;
  }

  dispose(): void {
    this.audioScheduler?.dispose();
    this.mediaSource?.dispose();
  }

  // Serialization
  toJSON(): SerializedLayer;
  static fromJSON(data: SerializedLayer): Promise<VideoLayer>;
}
```

### 6. Updated `Composition` (`src/lib/editor/composition/composition.svelte.ts`)

Key changes:

```typescript
import type { Drawable } from '../layers/types';

class Composition {
  // Type guard
  private isDrawable(layer: BaseLayer): layer is BaseLayer & Drawable {
    return 'getFrame' in layer && 'isVisibleAt' in layer;
  }

  async start(): Promise<void> {
    if (this.playing) return;
    this.playing = true;

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const anchor = this.audioCtx.currentTime - this.currentTimestamp;

    for (const layer of this.layers.values()) {
      await layer.onPlay(anchor, this.currentTimestamp);
    }

    requestAnimationFrame(() => this._tick({ anchor }));
  }

  async stop(): Promise<void> {
    if (!this.playing) return;
    this.playing = false;

    for (const layer of this.layers.values()) {
      layer.onPause();
    }
  }

  private async _tick({ anchor }: { anchor: number }): Promise<void> {
    if (!this.playing) return;

    this.currentTimestamp = this.audioCtx.currentTime - anchor;
    this._canvasCtx!.clearRect(0, 0, this._canvas!.width, this._canvas!.height);

    // Process layers sequentially
    for (const layer of this.layers.values()) {
      // Audio tick
      await layer.onTick(anchor, this.currentTimestamp);

      // Video fetch and draw
      if (this.isDrawable(layer) && layer.isVisibleAt(this.currentTimestamp)) {
        const frame = await layer.getFrame(this.currentTimestamp);
        if (frame) {
          this._canvasCtx!.drawImage(frame, 0, 0, frame.width, frame.height);
        }
      }
    }

    requestAnimationFrame(() => this._tick({ anchor }));
  }

  async seek(time: number): Promise<void> {
    if (time < 0 || time > this.duration) return;

    const wasPlaying = this.playing;
    if (wasPlaying) {
      await this.stop();
    }

    this.currentTimestamp = time;

    // Draw frame at new position
    this._canvasCtx!.clearRect(0, 0, this._canvas!.width, this._canvas!.height);
    for (const layer of this.layers.values()) {
      if (this.isDrawable(layer) && layer.isVisibleAt(time)) {
        const frame = await layer.getFrame(time);
        if (frame) {
          this._canvasCtx!.drawImage(frame, 0, 0, frame.width, frame.height);
        }
      }
    }

    if (wasPlaying) {
      await this.start();
    }
  }

  // Remove: draw(layer: VideoLayer) method
  // Remove: VideoLayer import (if not used elsewhere)
}
```

---

## Migration Path

1. Create `MediaSource` and `AudioScheduler`
2. Update `types.ts` with new interfaces
3. Update `BaseLayer` with new abstract methods
4. Refactor `VideoLayer` to use new architecture
5. Update `Composition` to use new layer API
6. Delete `probe.ts` (now unused)
7. Test playback and seeking

---

## Questions Before Implementation

1. **Rename `VideoLayer.init()` to `VideoLayer.create()`?** More consistent with `MediaSource.create()`. Or keep `init()`?

2. **Layer ordering during draw**: Currently you iterate `layers` in insertion order. Should we add a `zIndex` property for explicit ordering?

3. **Error handling in `_tick`**: If `getFrame()` throws, should we catch and continue (show blank) or let it bubble up?

4. **Shall I proceed with implementation?**

---

## User

1. yes 2. yes 3. yes 4. no I want you to give me abstract classes without any implementation I'll do it myself

---

## Assistant

Got it. Here are the abstract class specifications with no implementation - just the interfaces, types, and method signatures for you to implement.

---

## 1. `src/lib/media/media-source.ts`

```typescript
import type { Input, CanvasSink, AudioBufferSink } from 'mediabunny';

export interface MediaSourceOptions {
  fileId: string;
  projectFilesDir: string;
}

export interface VideoSinkOptions {
  width?: number;
  height?: number;
}

export interface VideoDimensions {
  width: number;
  height: number;
}

export abstract class MediaSource {
  protected abstract input: Input;

  // Factory
  static create(options: MediaSourceOptions): Promise<MediaSource>;

  // Metadata
  abstract get duration(): number;
  abstract get hasVideo(): boolean;
  abstract get hasAudio(): boolean;
  abstract get videoDimensions(): VideoDimensions | null;
  abstract get videoFps(): number | null;

  // Sinks
  abstract getVideoSink(options?: VideoSinkOptions): CanvasSink;
  abstract getAudioSink(): AudioBufferSink;
  abstract setVideoSinkOptions(options: VideoSinkOptions): void;

  // Cleanup
  abstract dispose(): void;
}
```

---

## 2. `src/lib/media/audio-scheduler.ts`

```typescript
import type { AudioBufferSink } from 'mediabunny';

export interface AudioSchedulerOptions {
  lookAheadSeconds?: number;
  gain?: number;
}

export abstract class AudioScheduler {
  constructor(
    audioSink: AudioBufferSink,
    audioCtx: AudioContext,
    options?: AudioSchedulerOptions
  );

  abstract start(layerTime: number): Promise<void>;
  abstract stop(): void;
  abstract scheduleAhead(layerTime: number, anchorTime: number): Promise<void>;
  abstract setGain(value: number): void;
  abstract dispose(): void;
}
```

---

## 3. `src/lib/editor/layers/types.ts` (additions)

```typescript
export interface Drawable {
  getFrame(timestamp: number): Promise<OffscreenCanvas | null>;
  isVisibleAt(timestamp: number): boolean;
}

export interface PlayOptions {
  anchor: number;
  time: number;
}

// Add zIndex to BaseLayerOptions
export interface BaseLayerOptions {
  type: LayerType;
  projectId: string;
  startOffset: number;
  zIndex?: number;
}
```

---

## 4. `src/lib/editor/layers/base.svelte.ts`

```typescript
import type { Composition } from '../composition';
import type { Drawable, SerializedLayer, BaseLayerOptions } from './types';

export abstract class BaseLayer implements Drawable {
  public abstract readonly id: string;
  public abstract readonly type: LayerType;
  public abstract readonly projectId: string;

  // Timeline positioning (reactive via $state)
  public abstract startOffset: number;
  public abstract startTime: number;
  public abstract endTime: number | null;
  public abstract zIndex: number;

  // Composition reference
  protected abstract _comp: Composition | null;

  // Drawable interface
  abstract getFrame(timestamp: number): Promise<OffscreenCanvas | null>;
  abstract isVisibleAt(timestamp: number): boolean;

  // Audio lifecycle
  abstract onPlay(anchor: number, time: number): Promise<void>;
  abstract onPause(): void;
  abstract onTick(anchor: number, time: number): Promise<void>;

  // Composition attachment
  abstract attach(comp: Composition): Promise<void>;
  abstract detach(): Promise<void>;
  protected abstract onAttach(): Promise<void>;
  protected abstract onDetach(): Promise<void>;

  // Cleanup
  abstract dispose(): void;

  // Serialization
  abstract toJSON(): SerializedLayer;

  // Helpers
  abstract get projectFilesDir(): string;
  abstract get audioCtx(): AudioContext | null;
}
```

---

## 5. `src/lib/editor/layers/video.ts`

```typescript
import type { MediaSource } from '$lib/media/media-source';
import type { AudioScheduler } from '$lib/media/audio-scheduler';
import { BaseLayer } from './base.svelte';
import type { Drawable, SerializedLayer, VideoLayerOptions } from './types';

export abstract class VideoLayer extends BaseLayer implements Drawable {
  public abstract readonly fileId: string;

  protected abstract mediaSource: MediaSource | null;
  protected abstract audioScheduler: AudioScheduler | null;

  // Factory
  static create(options: VideoLayerOptions): Promise<VideoLayer>;

  // Drawable implementation
  abstract getFrame(timestamp: number): Promise<OffscreenCanvas | null>;
  abstract isVisibleAt(timestamp: number): boolean;

  // Audio lifecycle
  abstract onPlay(anchor: number, time: number): Promise<void>;
  abstract onPause(): void;
  abstract onTick(anchor: number, time: number): Promise<void>;

  // Layer-level controls
  abstract setVolume(value: number): void;
  abstract setPreviewResolution(width: number, height: number): void;

  // Composition hooks
  protected abstract onAttach(): Promise<void>;
  protected abstract onDetach(): Promise<void>;

  // Cleanup
  abstract dispose(): void;

  // Serialization
  abstract toJSON(): SerializedLayer;
  static fromJSON(data: SerializedLayer): Promise<VideoLayer>;
}
```

---

## 6. `src/lib/editor/composition/composition.svelte.ts`

```typescript
import type { BaseLayer } from '../layers/base.svelte';
import type { Drawable } from '../layers/types';
import type { SerializedComposition, CompositionOptions } from './types';

export abstract class Composition {
  public abstract readonly id: string;
  public abstract readonly fps: number;
  public abstract readonly name: string;
  public abstract readonly duration: number;
  public abstract readonly aspectRatio: number;
  public abstract readonly audioCtx: AudioContext;

  // Reactive state
  public abstract currentTimestamp: number;
  public abstract playing: boolean;

  // Layer management
  public abstract readonly layers: Map<string, BaseLayer>;
  abstract insertLayer(layer: BaseLayer): void;
  abstract removeLayer(layerId: string): void;
  abstract getLayersByZIndex(): BaseLayer[];

  // Playback
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract seek(time: number): Promise<void>;

  // Internal tick loop
  protected abstract _tick(options: { anchor: number }): Promise<void>;

  // Type guard for drawable layers
  protected abstract isDrawable(layer: BaseLayer): layer is BaseLayer & Drawable;

  // Canvas management
  abstract set canvas(canvas: HTMLCanvasElement);
  abstract rescale(): void;

  // Serialization
  abstract toJSON(): SerializedComposition;
  static fromJSON(json: SerializedComposition): Promise<Composition>;
  abstract save(): Promise<void>;
}
```

---

## 7. `src/lib/editor/composition/types.ts` (additions if needed)

```typescript
// Ensure these exist
export interface CompositionOptions {
  id?: string;
  fps?: number;
  name?: string;
  duration?: number;
  aspectRatio?: number;
  projectId: string;
}

export interface SerializedComposition {
  id: string;
  fps: number;
  name: string;
  duration: number;
  aspectRatio: number;
  projectId: string;
  layers: SerializedLayer[];
}
```

---

## Files to Delete

- `src/lib/media/probe.ts` - replaced by `MediaSource` metadata getters

---

## Export Updates

### `src/lib/media/index.ts`

```typescript
export { MediaSource } from './media-source';
export type { MediaSourceOptions, VideoSinkOptions, VideoDimensions } from './media-source';

export { AudioScheduler } from './audio-scheduler';
export type { AudioSchedulerOptions } from './audio-scheduler';

// Keep existing exports
export { getFileManager } from './file-manager.svelte';
// ... etc
```

### `src/lib/editor/layers/index.ts`

```typescript
export { BaseLayer } from './base.svelte';
export { VideoLayer } from './video';
export { createLayer } from './factory';

export type { 
  Drawable,
  PlayOptions,
  LayerType,
  BaseLayerOptions,
  VideoLayerOptions,
  SerializedLayer 
} from './types';
```

---

That's the complete specification. All abstract classes and interfaces are defined with their method signatures, properties, and relationships. You have full freedom to implement the internals as you see fit.

---

## User

review this @src/lib/media/media-source.ts 

---

## Assistant

## Code Review: `MediaSource`

Overall this is clean and well-structured. A few observations:

### Issues

**1. `videoSink` and `audioSink` create new instances on every access**

```typescript
get videoSink() {
  return new CanvasSink(this.videoTrack);  // New instance every call
}
```

This is problematic because:
- Each `CanvasSink` holds its own decoder state
- Calling `getCanvas()` on different sink instances won't share seek position
- Memory leak potential if callers don't dispose the sinks

**Recommendation**: Cache the sinks lazily, or change to methods that explicitly create new instances:

```typescript
// Option A: Cached (matches original spec)
private _videoSink: CanvasSink | null = null;

get videoSink(): CanvasSink {
  if (!this.videoTrack) throw new Error("This media source has no video");
  if (!this._videoSink) {
    this._videoSink = new CanvasSink(this.videoTrack, { poolSize: 0 });
  }
  return this._videoSink;
}

// Option B: Explicit factory method (clearer intent)
createVideoSink(options?: { poolSize?: number }): CanvasSink {
  if (!this.videoTrack) throw new Error("This media source has no video");
  return new CanvasSink(this.videoTrack, options);
}
```

---

**2. Missing `poolSize: 0` for CanvasSink**

Per your earlier requirement to disable pooling:

```typescript
return new CanvasSink(this.videoTrack, { poolSize: 0 });
```

---

**3. `audioSink` returns `AudioSampleSink` but spec called for `AudioBufferSink`**

```typescript
get audioSink() {
  return new AudioSampleSink(this.audioTrack);  // AudioSampleSink
}
```

`AudioSampleSink` gives you raw `Float32Array` samples. `AudioBufferSink` gives you `AudioBuffer` objects ready for Web Audio API.

For the `AudioScheduler` to work with `AudioContext.createBufferSource()`, you likely want `AudioBufferSink`:

```typescript
import { AudioBufferSink } from 'mediabunny';

get audioSink(): AudioBufferSink {
  if (!this.audioTrack) throw new Error("This media source has no audio");
  return new AudioBufferSink(this.audioTrack);
}
```

---

**4. `videoDimensions` throws instead of returning `null`**

The spec suggested returning `null` if no video track, which lets callers check without try/catch:

```typescript
// Current
get videoDimensions(): VideoDimensions {
  if (!this.videoTrack) throw new Error("This media source has no video");
  // ...
}

// Alternative (more ergonomic)
get videoDimensions(): VideoDimensions | null {
  if (!this.videoTrack) return null;
  return {
    width: this.videoTrack.displayWidth,
    height: this.videoTrack.displayHeight
  };
}
```

Same for `getVideoFps()`. This lets callers do:

```typescript
if (mediaSource.videoDimensions) {
  // has video
}
```

Instead of:

```typescript
if (mediaSource.hasVideo) {
  const dims = mediaSource.videoDimensions;  // Could still throw if race condition
}
```

Up to you - throwing is also valid if you prefer explicit checks via `hasVideo`.

---

**5. Missing `duration` getter**

You store `duration` as protected but there's no public accessor:

```typescript
get duration(): number {
  return this.duration;  // Wait, this shadows - need different internal name
}
```

You'll need to rename the internal property:

```typescript
protected _duration: number;

get duration(): number {
  return this._duration;
}
```

---

**6. Missing `setVideoSinkOptions` for resolution changes**

The spec included this for user-configurable preview resolution. If you're caching the sink, you need a way to invalidate it when resolution changes:

```typescript
setVideoSinkOptions(options: { width?: number; height?: number }): void {
  this._videoSink = null;  // Invalidate cached sink
  this._videoSinkOptions = options;
}
```

---

### Minor Suggestions

**7. Export the interfaces**

```typescript
export interface CreateMediaSourceOptions { ... }
export interface VideoDimensions { ... }
```

These might be useful for callers.

**8. Consider adding `videoRotation`**

Some videos have rotation metadata. Mediabunny's `InputVideoTrack` likely exposes this. Might be useful later for proper display.

---

## Summary

| Issue | Severity | Fix |
|-------|----------|-----|
| Sinks create new instances each access | High | Cache or rename to `createVideoSink()` |
| Missing `poolSize: 0` | Medium | Add to CanvasSink options |
| `AudioSampleSink` vs `AudioBufferSink` | High | Use `AudioBufferSink` for Web Audio API |
| `videoDimensions` throws vs returns null | Low | Personal preference |
| Missing `duration` getter | High | Add public getter, rename internal field |
| Missing `setVideoSinkOptions` | Medium | Add if you want resolution switching |

---

Want me to review `AudioScheduler` next, or would you like to revise `MediaSource` first?

---

## User

review it again @src/lib/media/media-source.ts 

---

## Assistant

## Code Review: `MediaSource` (Revised)

This is much better. Clean implementation that addresses the previous issues. A few remaining observations:

### Issues

**1. `getVideoSink` ignores options after first call**

```typescript
getVideoSink(options?: CanvasSinkOptions) {
  if (!this._canvasSink) {
    this._canvasSink = new CanvasSink(this.videoTrack, options ?? { poolSize: 0 });
  }
  return this._canvasSink;  // Returns cached sink, ignores new options
}
```

If someone calls `getVideoSink({ width: 1920 })` then later `getVideoSink({ width: 640 })`, the second call returns the 1920-width sink.

**Options:**

```typescript
// Option A: Store options, invalidate if changed
private _canvasSinkOptions: CanvasSinkOptions = { poolSize: 0 };

getVideoSink(options?: CanvasSinkOptions) {
  if (!this.videoTrack) throw new Error("This media source has no video");
  
  const opts = options ?? { poolSize: 0 };
  const optionsChanged = JSON.stringify(opts) !== JSON.stringify(this._canvasSinkOptions);
  
  if (!this._canvasSink || optionsChanged) {
    this._canvasSink = new CanvasSink(this.videoTrack, opts);
    this._canvasSinkOptions = opts;
  }
  
  return this._canvasSink;
}

// Option B: Separate method for resolution changes (clearer intent)
setVideoSinkOptions(options: CanvasSinkOptions): void {
  this._canvasSink = null;  // Invalidate
  this._canvasSinkOptions = options;
}

// Option C: Remove options param, always use stored options
private _canvasSinkOptions: CanvasSinkOptions = { poolSize: 0 };

getVideoSink(): CanvasSink {
  if (!this.videoTrack) throw new Error("This media source has no video");
  if (!this._canvasSink) {
    this._canvasSink = new CanvasSink(this.videoTrack, this._canvasSinkOptions);
  }
  return this._canvasSink;
}

setVideoSinkOptions(options: CanvasSinkOptions): void {
  this._canvasSink = null;
  this._canvasSinkOptions = { ...this._canvasSinkOptions, ...options };
}
```

I'd recommend **Option C** - cleaner separation between getting and configuring.

---

**2. Missing `hasVideo` and `hasAudio` getters**

These were in your original implementation and are useful for guards:

```typescript
get hasVideo(): boolean {
  return this.videoTrack !== null;
}

get hasAudio(): boolean {
  return this.audioTrack !== null;
}
```

Without these, callers need to do `mediaSource.videoDimensions !== null` which is less intuitive.

---

**3. Unused import**

```typescript
import { AudioSampleSink } from "mediabunny";  // Not used
```

---

### Minor Suggestions

**4. Consider caching FPS result directly**

Currently you cache `_videoStats` and derive FPS from it. This is fine, but if you only ever need FPS, you could simplify:

```typescript
private _videoFps: number | null = null;

async getVideoFps(): Promise<number | null> {
  if (!this.videoTrack) return null;
  if (this._videoFps === null) {
    const stats = await this.videoTrack.computePacketStats();
    this._videoFps = stats.averagePacketRate;
  }
  return this._videoFps;
}
```

But keeping `_videoStats` is fine if you might need other stats later (like `averagePacketSize`).

**5. Type annotation on `create` return type**

```typescript
static async create({ fileId, projectFilesDir }: CreateMediaSourceOptions): Promise<MediaSource> {
```

Not required but aids readability.

---

### Summary

| Issue | Severity | Status |
|-------|----------|--------|
| Sinks cached properly | ✅ | Fixed |
| `poolSize: 0` | ✅ | Fixed |
| `AudioBufferSink` instead of `AudioSampleSink` | ✅ | Fixed |
| `videoDimensions` returns null | ✅ | Fixed |
| `duration` is public | ✅ | Fixed |
| FPS result cached | ✅ | Fixed |
| Interfaces exported | ✅ | Fixed |
| `getVideoSink` ignores options on subsequent calls | Medium | Needs fix |
| Missing `hasVideo`/`hasAudio` | Low | Nice to have |
| Unused `AudioSampleSink` import | Low | Cleanup |

---

Overall this is solid. The only functional issue is the options handling in `getVideoSink`. Ready to review `AudioScheduler` when you have it.

---

## User

review it again

---

## Assistant

I don't see a new file to review. Could you share the updated `MediaSource` file or the `AudioScheduler` implementation you'd like me to review?

---

## User

review it again @src/lib/media/media-source.ts 

---

## Assistant

## Code Review: `MediaSource` (Final)

This looks good. Clean, well-structured, addresses all previous issues.

### ✅ All Previous Issues Resolved

| Issue | Status |
|-------|--------|
| Sinks cached properly | ✅ |
| `poolSize: 0` | ✅ |
| `AudioBufferSink` used | ✅ |
| `videoDimensions` returns null | ✅ |
| `duration` is public | ✅ |
| FPS result cached | ✅ |
| Interfaces exported | ✅ |
| `hasVideo`/`hasAudio` getters | ✅ |
| `setVideoSinkOptions` invalidates cache | ✅ |
| Unused imports removed | ✅ |

### One Minor Observation

**`setVideoSinkOptions` replaces instead of merges**

```typescript
setVideoSinkOptions(options: VideoSinkOptions) {
  this._canvasSink = null;
  this._videoSinkOptions = options;  // Replaces entirely
}
```

If someone calls:
```typescript
mediaSource.setVideoSinkOptions({ width: 1280 });
mediaSource.setVideoSinkOptions({ height: 720 });  // width is now undefined
```

This might be intentional (full replacement), but if you want merging:

```typescript
setVideoSinkOptions(options: VideoSinkOptions) {
  this._canvasSink = null;
  this._videoSinkOptions = { ...this._videoSinkOptions, ...options };
}
```

Not a bug - just a design choice. Current behavior is fine if callers always pass complete options.

---

### Verdict

**Ready to go.** No blocking issues.

Ready to review `AudioScheduler` when you have it.

---

