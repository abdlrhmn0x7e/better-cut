## Better Cut – Client‑First Video Editor TODO

### Phase 0 – Product & architecture clarity

- [ ] **Define MVP scope**: decide primary workflows (e.g. shorts, YouTube videos, simple reels, screen recordings) and what “v1” must support (single sequence, basic cuts, one export format).
- [ ] **Document high‑level architecture**: Svelte UI + editor core (`Composition`/layers/timeline) + Konva canvas + Mediabunny I/O + local persistence.
- [ ] **Clarify performance budget**: max project length, target devices (laptops only vs tablets), approximate acceptable CPU/GPU usage.

### Phase 1 – Asset ingestion & metadata (Mediabunny)

- [ ] **Introduce Asset model**
  - [ ] Wrap imported `File` objects into an `Asset` type with: stable `id`, original `File`, display name, type (video/audio/image), and optional tags.
  - [ ] Store Mediabunny `Input` + `BlobSource` per asset for lazy reads instead of accessing raw `File` everywhere.
  - [ ] Replace `ctx.files: SvelteMap<string, File>` with `SvelteMap<string, Asset>` while keeping the drag/drop `id` semantics.
- [ ] **Metadata extraction via Mediabunny**
  - [ ] Use `Input` + `ALL_FORMATS` to support mp4, mov, webm, mkv, mp3, wav, flac, ogg, etc.
  - [ ] For video assets, compute duration, resolution, rotation, approximate FPS (`computePacketStats`), and HDR flag (`hasHighDynamicRange`).
  - [ ] For audio assets, compute duration, sample rate, channel count, and average bitrate.
  - [ ] Cache extracted metadata on the `Asset` and avoid re‑parsing for subsequent operations.
- [ ] **Thumbnails & waveforms**
  - [ ] Keep current HTML `<video>` thumbnail path as a fallback, but add a Mediabunny‑powered path using `CanvasSink` or `VideoSampleSink` for more precise control (e.g. select timestamp).
  - [ ] Generate multiple thumbnails per video (start/middle/end) for hover previews or future design ideas.
  - [ ] For audio, prototype a small waveform thumbnail via `AudioSampleSink` + canvas.
- [ ] **Surface metadata in UI**
  - [ ] Show duration, resolution, and FPS in `FileCard` hover state or secondary text.
  - [ ] Indicate unsupported / partially supported codecs and containers in the project panel (with a clear tooltip).

### Phase 2 – Composition & timeline domain model

- [ ] **Define core domain entities**
  - [ ] `Project`: id, name, created/updated timestamps, list of sequences, project‑level settings (default resolution/fps, theme etc.).
  - [ ] `Sequence` / `Composition`: resolution, FPS, duration, background color, list of `Tracks`.
  - [ ] `Track`: id, type (`video` | `audio` | `image` | `text`), index, mute/solo, locked, visibility.
  - [ ] `Clip`: id, `assetId`, `trackId`, `startTime` on timeline, `inPoint`/`outPoint` into asset, playback rate, enabled flag.
- [ ] **Extend `Composition` class**
  - [ ] Make `Composition` own `tracks` and `clips` instead of only Konva layers.
  - [ ] Replace ad‑hoc `duration` with computed sequence duration from clips.
  - [ ] Make `playhead` / `playing` the single source of truth for playback state (UI subscribes to this).
  - [ ] Add API: `addClip`, `removeClip`, `moveClip`, `trimClip`, `splitClip`, `setPlayhead`, `togglePlay`, etc.
- [ ] **Konva integration as a view layer**
  - [ ] Refactor `VideoLayer` to be a rendering representation of a `Clip` (Konva nodes and transformers bound to model).
  - [ ] Keep Konva `Layer` ordering in sync with track order and clip z‑index within a track.
  - [ ] Add selection state and transform handles using `Konva.Transformer` for the active clip.
- [ ] **Undo/redo foundation**
  - [ ] Introduce an action/command layer (e.g. `EditorAction` objects) around composition mutations.
  - [ ] Add an undo/redo stack (bounded history) and wire it to editor keyboard shortcuts.

### Phase 3 – Timeline UI/UX

- [ ] **Replace placeholder `Timeline` with real tracks view**
  - [ ] Implement track headers (name, type icon, mute/solo, lock, eye).
  - [ ] Implement horizontal time ruler with timecode labels and zoom controls.
  - [ ] Implement draggable playhead that drives `Composition.playhead`.
- [ ] **Clip rendering**
  - [ ] Render clips as blocks with label (asset name) and duration proportional to timeline zoom.
  - [ ] Differentiate track types visually (color code video vs audio vs text).
  - [ ] Add visual handles at clip edges for trimming.
- [ ] **Interactions**
  - [ ] Drag asset from `ProjectFiles` to timeline to create a new clip at drop position.
  - [ ] Drag clips along the timeline (with optional grid/snapping to playhead and other clip edges).
  - [ ] Resize clips by dragging edges, updating `inPoint`/`outPoint` accordingly.
  - [ ] Implement clip splitting at playhead via context menu + keyboard shortcut.
  - [ ] Implement simple ripple delete / gap delete behaviour for cuts.
- [ ] **Timeline navigation**
  - [ ] Zoom in/out in time (scroll + modifier keys, dedicated controls).
  - [ ] Scroll horizontally for long projects, with a minimap / overview if needed.
  - [ ] Implement keyboard shortcuts for navigation (jump to start/end, jump to next/prev cut, toggle snapping).

### Phase 4 – Playback engine & preview

- [ ] **Playback strategy**
  - [ ] Short term: keep HTMLVideoElement‑backed `VideoLayer` for preview (existing `loadVideo`/`createVideoLayer` flow).
  - [ ] Long term: evaluate Mediabunny `VideoSampleSink` + `CanvasSink`‑driven preview for frame‑accurate scrubbing under heavy timelines.
- [ ] **Global playback loop**
  - [ ] Implement a central playback loop in `Composition` (e.g. `requestAnimationFrame` + monotonic clock).
  - [ ] Advance `playhead` according to fps and `playing` state; clamp to sequence duration.
  - [ ] For each `VideoLayer`, sync underlying `HTMLVideoElement.currentTime` to the composition playhead plus clip offset.
  - [ ] Reduce Konva updates when off‑screen or not changing (throttle / dirty flag).
- [ ] **Scrubbing & seeking**
  - [ ] Scrubbing the playhead in the timeline should immediately update the Konva preview (no visible lag).
  - [ ] Implement “jog wheel” style keyboard shortcuts for frame‑by‑frame stepping.
  - [ ] For Mediabunny preview experiments, test seeking via `VideoSampleSink.getSample` or `CanvasSink.getCanvas`.
- [ ] **Preview controls**
  - [ ] Complete `VideoPreview` controls (currently play/pause placeholder) with: play/pause, jump to start/end, step ±1 frame.
  - [ ] Support adjustable playback rate (0.25×–2×).
  - [ ] Add full‑screen toggle and safe‑area guides overlay (16:9, 9:16, etc.).

### Phase 5 – Export pipeline (Mediabunny)

- [ ] **MVP export**
  - [ ] Implement a simple “Export selected clip” flow: one asset in, one mp4 or webm out, using `Input` + `Output` + `Conversion`.
  - [ ] Support trimming via `Conversion` `trim` options based on clip in/out points.
  - [ ] Add progress UI using `Conversion.onProgress` and basic error handling.
- [ ] **Sequence render**
  - [ ] Design a render graph that walks tracks/clips and produces final video frames from the Konva scene (e.g. via `CanvasSource`).
  - [ ] For audio, mix down all audio clips into a final track using `AudioBufferSource` or `AudioSampleSource`.
  - [ ] Ensure composition and export share the same timing model so what you see is what you get.
- [ ] **Export settings UI**
  - [ ] Allow selecting container (mp4, webm, mkv, wav/audio‑only).
  - [ ] Choose codec based on `getFirstEncodableVideoCodec` / `getFirstEncodableAudioCodec` and surface only supported choices.
  - [ ] Offer presets (e.g. “Web 1080p 20 Mbps”, “Social 1080×1920 8 Mbps”, “Audio‑only 160 kbps”).
  - [ ] Add options for fast‑start MP4 (`fastStart` options) or streaming‑friendly fragmented MP4/WebM.
- [ ] **Advanced export**
  - [ ] Support transparent video export via WebM + alpha (`CanvasSource` with `alpha: 'keep'`).
  - [ ] Allow exporting audio‑only from selected audio tracks.
  - [ ] Provide “compressed” export preset using Mediabunny compression examples (resize, bitrate, resampling).

### Phase 6 – Audio features

- [ ] **Track‑level audio support**
  - [ ] Allow importing audio‑only files (music, VO, SFX) and display them in project panel with audio badge.
  - [ ] Add dedicated audio tracks in timeline with proper clip visualization (waveforms instead of thumbnails).
  - [ ] Implement track‑level mute/solo and master volume control.
- [ ] **Waveforms & meters**
  - [ ] Generate waveform data using Mediabunny `AudioSampleSink` and cache it per asset.
  - [ ] Render lightweight waveform previews in clips and a more detailed zoomed view when needed.
  - [ ] Add simple level meters (peak/RMS) during playback.
- [ ] **Audio editing & processing**
  - [ ] Implement fade in/out and crossfade handles on audio clips.
  - [ ] Support volume automation per clip (simple envelope first, later keyframes).
  - [ ] Use Mediabunny audio conversion to normalize loudness and resample everything to a consistent sample rate on export.

### Phase 7 – Effects, overlays & graphics

- [ ] **New layer types**
  - [ ] Image layer: import PNG/JPEG/WebP and place them as overlays in `Composition` via new Konva layer type.
  - [ ] Text layer: simple text boxes with font, size, color, alignment, background.
  - [ ] Shape layers: rectangles, circles, gradient backgrounds for simple graphics.
- [ ] **Transforms & keyframes**
  - [ ] Extend layer model with transform properties (position, scale, rotation, opacity).
  - [ ] Implement transform controls in preview (Konva transformers for non‑video layers too).
  - [ ] Add timeline keyframe tracks for selected properties, with interpolation.
- [ ] **Visual effects**
  - [ ] Basic color adjustments (brightness/contrast/saturation) via canvas processing.
  - [ ] Simple LUT‑style color presets (applied with Mediabunny video processing or pre‑composition).
  - [ ] Per‑clip blend‑style options where feasible.

### Phase 8 – Project persistence & offline‑first

- [ ] **Project format**
  - [ ] Define a JSON schema for `Project`/`Sequence`/`Track`/`Clip`/automation/markers.
  - [ ] Ensure the schema references assets by stable IDs instead of raw `File` objects.
  - [ ] Plan for schema versioning and migrations.
- [ ] **Local persistence**
  - [ ] MVP: store project JSON in IndexedDB (Dexie or hand‑rolled) keyed by project id.
  - [ ] Investigate File System Access API for persisting large assets outside IndexedDB while keeping references.
  - [ ] Add “Save project”, “Save as…”, and “Open project” flows (including error states when asset files are missing).
- [ ] **Autosave & recovery**
  - [ ] Implement periodic autosave in the background when there are dirty changes.
  - [ ] Add crash‑recovery or “restore last session” option on app start.

### Phase 9 – UX polish & ergonomics

- [ ] **Layout & interactions**
  - [ ] Refine Resizable layout defaults (sensible min/max sizes, collapse behaviours).
  - [ ] Improve empty states and copy in `ProjectPanel` and `Timeline` for first‑time users.
  - [ ] Add contextual tooltips for controls (especially export, Mediabunny‑powered options).
- [ ] **Accessibility & input**
  - [ ] Improve keyboard navigation across panels and within timeline.
  - [ ] Add ARIA roles and focus styling for draggable/droppable areas (project files, timeline, Konva preview).
  - [ ] Offer themes and high‑contrast mode (build on existing `mode-watcher` / dark mode setup).
- [ ] **Quality of life**
  - [ ] Implement simple command palette for common actions (import, export, split, ripple delete).
  - [ ] Add in‑app tips or a quick start guide that references Mediabunny‑powered capabilities.

### Phase 10 – Testing, performance & tooling

- [ ] **Testing**
  - [ ] Add unit tests for core timeline math (clip overlaps, trimming, snapping, playback time mapping).
  - [ ] Add tests around Mediabunny integration (metadata extraction, thumbnail generation, basic conversions).
  - [ ] Create Vitest tests for Svelte components like `Timeline`, `VideoPreview`, `ProjectFiles`, and drag/drop flows.
- [ ] **Performance profiling**
  - [ ] Measure import time, playback smoothness, and export duration for representative projects.
  - [ ] Profile memory usage for long sessions (ensure Mediabunny `Input`/`Output` instances and Konva nodes are disposed properly).
  - [ ] Use Chrome Performance and Svelte dev tools to find unnecessary reactivity churn in editor state.
- [ ] **Developer experience**
  - [ ] Keep ESLint/Prettier configuration enforced; clean up any editor‑related lints.
  - [ ] Document how to run dev, tests, and any browser flags needed for WebCodecs/Mediabunny.
  - [ ] Add minimal CI that runs `lint`, `check`, and `test` for PRs.
