# Better Cut

Open source client first video editor.

## TODO

- [x] Implement file import for video/audio/image assets
- [ ] Use WebCodecs API to decode video frames efficiently
- [ ] Create playhead store and timeline store (clips[], tracks[], playhead)
- [ ] Sync playhead between decoding and UI (two-way)
- [ ] Display a basic timeline with one clip
- [ ] Implement seeking (update playhead → request frame at time T)
- [ ] Add clip trimming (drag left/right edges)
- [ ] Set timeline duration based on video duration
- [ ] Add multi-clip support
- [ ] Make clips draggable as a whole (left/right movement)
- [ ] Add snapping (to clip edges and playhead)
- [ ] Add timeline zooming (scroll or slider)
- [ ] Create WebGL renderer for video frames
- [ ] Add Canvas2D overlay for UI elements (guides, text, overlays)
- [ ] Build render loop using requestAnimationFrame
- [ ] Apply basic transforms in WebGL (scale, translate, crop)
- [ ] Add support for multiple video tracks
- [ ] Add frame compositing (combine clips into final preview frame)
- [ ] Load audio using Web Audio API
- [ ] Create audio graph (gain, panning, effects)
- [ ] Sync audio with video playhead
- [ ] Add multiple audio clips with separate tracks
- [ ] Render audio waveform in the timeline
- [ ] Add WebGL shader effects (brightness, contrast, blur, etc.)
- [ ] Add transitions (crossfade, slide, zoom)
- [ ] Implement keyframes for transforms/effects
- [ ] Add LUT support (optional)
- [ ] Use WebCodecs VideoEncoder for fast browser exports
- [ ] Add WASM/FFmpeg fallback for full compatibility
- [ ] Move exporting into a Worker (non-blocking)
- [ ] Add export progress UI
- [ ] Support output formats: WebM (native) + H.264/H.265 via WASM
- [ ] Move WebGL + WebCodecs decoding to Worker via OffscreenCanvas
- [ ] Add frame caching & pre-decoding around playhead
- [ ] Add undo/redo system
- [ ] Add keyboard shortcuts (J/K/L, arrows, shift-drag)
- [ ] Optimize timeline rendering for long projects
- [ ] Support images (PNGs, JPEGs)
- [ ] Add text overlays (Canvas or SDF in WebGL)
- [ ] Add autosave to IndexedDB
- [ ] Add drag-and-drop import
- [ ] Add UI theme, toolbars, and editor layout
- [ ] Add settings: playback quality, proxy resolution, GPU mode
- [ ] Create project metadata schema (JSON)
- [ ] Add project saving/loading
- [ ] Final architecture cleanup (core, render, UI, stores)
- [ ] Deploy production build
