import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Download,
  Loader2,
} from "lucide-react";
import {
  Photo,
  AnimationEffect,
  BackgroundSettings,
  PhotoAnimState,
} from "../types";
import {
  buildEffectPlan,
  interpolateFrame,
  EffectPlan,
} from "../utils/animationEffects";
import {
  captureFrame,
  encodeGIF,
  encodeMP4,
  downloadBlob,
  ExportProgress,
} from "../utils/videoExport";

// ─── Types ──────────────────────────────────────────────────────────

interface AnimationDialogProps {
  photos: Photo[];
  background: BackgroundSettings;
  onClose: () => void;
}

// ─── Preview Photo Card (simplified – no drag or controls) ───────────

interface PreviewCardProps {
  photo: Photo;
  domRef: (el: HTMLDivElement | null) => void;
}

const PreviewCard: React.FC<PreviewCardProps> = ({ photo, domRef }) => {
  const width = photo.width || 4;
  const height = photo.height || 5;
  const aspectRatio = width / height;
  const isLandscape = aspectRatio > 1.2;
  const cardBaseWidth = isLandscape ? 300 : 220;

  return (
    <div
      ref={domRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        willChange: "transform, opacity",
        // Initial transform will be set by applyStatesToDOM in useEffect
        zIndex: photo.zIndex,
      }}
    >
      {/* Polaroid frame — matches PhotoCard: p-3 pb-8 = 12px sides, 32px bottom */}
      <div
        style={{
          width: cardBaseWidth,
          padding: "12px 12px 32px 12px",
          backgroundColor: "#faf9f6",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)",
          borderRadius: "2px",
        }}
      >
        {/* Photo area — use aspectRatio CSS (same as PhotoCard) so height is driven
            by the actual inner width (cardBaseWidth - 24px), not the total card width */}
        <div
          style={{
            width: "100%",
            aspectRatio: String(aspectRatio),
            backgroundImage: `url(${photo.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "sepia(0.1) contrast(1.05)",
          }}
        />
      </div>
    </div>
  );
};

// ─── Effect selector button ──────────────────────────────────────────

const EFFECTS: {
  id: AnimationEffect;
  label: string;
  emoji: string;
  desc: string;
}[] = [
  {
    id: "sequential",
    label: "Sequential",
    emoji: "🃏",
    desc: "Fly in one by one",
  },
  { id: "shuffle", label: "Shuffle", emoji: "🎴", desc: "Stack then scatter" },
  { id: "flip", label: "Flip", emoji: "🔄", desc: "Flip card entrance" },
  { id: "fade", label: "Fade", emoji: "✨", desc: "Fade & scale in" },
];

// ─── Main component ──────────────────────────────────────────────────

export const AnimationDialog: React.FC<AnimationDialogProps> = ({
  photos,
  background,
  onClose,
}) => {
  const [selectedEffect, setSelectedEffect] =
    useState<AnimationEffect>("sequential");
  const [speed, setSpeed] = useState(1.0);
  const [fps, setFps] = useState<15 | 24 | 30>(24);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLabel, setExportLabel] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Capture canvas (full-size, used for both preview display and frame export)
  const canvasRef = useRef<HTMLDivElement>(null);
  // Per-photo DOM element refs
  const photoRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const currentTRef = useRef<number>(0);
  const isPlayingRef = useRef(false);

  // Snapshot window size once at mount (canvas must match original layout)
  const [winW] = useState(() => window.innerWidth);
  const [winH] = useState(() => window.innerHeight);

  // Build animation plan
  const plan = useMemo<EffectPlan>(
    () => buildEffectPlan(photos, selectedEffect, winW, winH),
    [photos, selectedEffect, winW, winH],
  );

  // Always-current refs for the rAF tick closure — avoids stale closure bugs
  const planRef = useRef<EffectPlan>(plan);
  const photosRef = useRef<Photo[]>(photos);
  const selectedEffectRef = useRef<AnimationEffect>(selectedEffect);
  const speedRef = useRef<number>(speed);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    selectedEffectRef.current = selectedEffect;
  }, [selectedEffect]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // ── DOM helpers ────────────────────────────────────────────────────

  const applyStatesToDOM = useCallback((states: PhotoAnimState[]) => {
    states.forEach((state) => {
      const el = photoRefsRef.current.get(state.id);
      if (!el) return;
      el.style.transform = `translate(${state.x}px, ${state.y}px) rotate(${state.rotation}deg) rotateY(${state.rotateY}deg) scale(${state.scale})`;
      el.style.opacity = String(state.opacity);
    });
  }, []);

  const showFinalState = useCallback(() => {
    applyStatesToDOM(
      planRef.current.specs.map((s) => ({ id: s.photoId, ...s.to })),
    );
  }, [applyStatesToDOM]);

  // Show photos at final positions when dialog opens or plan changes
  useEffect(() => {
    showFinalState();
  }, [showFinalState]);

  // ── Playback ───────────────────────────────────────────────────────

  const stopAnimation = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    isPlayingRef.current = false;
  }, []);

  const startPlayback = useCallback(
    (fromT: number) => {
      stopAnimation();

      const spd = speedRef.current;
      const adjustedStart = performance.now() - (fromT / spd) * 1000;
      startTimeRef.current = adjustedStart;
      isPlayingRef.current = true;
      setIsPlaying(true);

      // Use always-current refs so tick is never stale regardless of re-renders
      const tick = () => {
        if (!isPlayingRef.current) return;

        const currentSpeed = speedRef.current;
        const elapsed =
          ((performance.now() - startTimeRef.current) / 1000) * currentSpeed;
        const currentPlan = planRef.current;
        const t = Math.min(elapsed, currentPlan.totalDuration);
        currentTRef.current = t;

        const states = interpolateFrame(
          currentPlan,
          photosRef.current,
          t,
          selectedEffectRef.current,
        );
        applyStatesToDOM(states);

        if (elapsed < currentPlan.totalDuration) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);
    },
    [stopAnimation, applyStatesToDOM],
  );

  const handlePlayPause = useCallback(() => {
    if (isPlayingRef.current) {
      stopAnimation();
      setIsPlaying(false);
    } else {
      const currentPlan = planRef.current;
      const t =
        currentTRef.current >= currentPlan.totalDuration - 0.05
          ? 0
          : currentTRef.current;

      if (t === 0) {
        // Apply "from" state, then let the browser paint one frame before starting
        applyStatesToDOM(
          currentPlan.specs.map((s) => ({ id: s.photoId, ...s.from })),
        );
        requestAnimationFrame(() => {
          requestAnimationFrame(() => startPlayback(0));
        });
      } else {
        startPlayback(t);
      }
    }
  }, [stopAnimation, startPlayback, applyStatesToDOM]);

  const handleReplay = useCallback(() => {
    stopAnimation();
    currentTRef.current = 0;
    setIsPlaying(false);
    const currentPlan = planRef.current;
    applyStatesToDOM(
      currentPlan.specs.map((s) => ({ id: s.photoId, ...s.from })),
    );
    requestAnimationFrame(() => {
      requestAnimationFrame(() => startPlayback(0));
    });
  }, [stopAnimation, startPlayback, applyStatesToDOM]);

  // When effect changes, stop and auto-play from beginning
  useEffect(() => {
    stopAnimation();
    setIsPlaying(false);
    currentTRef.current = 0;
    // planRef is already updated (its useEffect runs first in the same commit).
    // Apply "from" state then auto-play.
    requestAnimationFrame(() => {
      const currentPlan = planRef.current;
      applyStatesToDOM(
        currentPlan.specs.map((s) => ({ id: s.photoId, ...s.from })),
      );
      requestAnimationFrame(() => startPlayback(0));
    });
  }, [selectedEffect, stopAnimation, applyStatesToDOM, startPlayback]);

  // Cleanup on unmount
  useEffect(() => () => stopAnimation(), [stopAnimation]);

  // ── Export ─────────────────────────────────────────────────────────

  const handleExport = useCallback(
    async (format: "gif" | "mp4") => {
      if (isExporting || !canvasRef.current) return;
      stopAnimation();
      setIsPlaying(false);
      currentTRef.current = 0;
      setIsExporting(true);
      setExportProgress(0);
      setExportLabel("Capturing frames…");

      const el = canvasRef.current;
      const currentPlan = planRef.current;
      const currentPhotos = photosRef.current;
      const currentEffect = selectedEffectRef.current;
      const frameCount = Math.ceil(currentPlan.totalDuration * fps);
      const frames: string[] = [];

      try {
        // Frame capture loop
        for (let i = 0; i < frameCount; i++) {
          const t = i / fps;
          const states = interpolateFrame(
            currentPlan,
            currentPhotos,
            t,
            currentEffect,
          );
          applyStatesToDOM(states);
          // Wait a rAF so the browser commits the style changes
          await new Promise<void>((res) => requestAnimationFrame(() => res()));
          const frame = await captureFrame(el, winW, winH);
          frames.push(frame);
          setExportProgress(((i + 1) / frameCount) * 0.45);
        }

        setExportLabel(format === "gif" ? "Encoding GIF…" : "Loading encoder…");

        const onProgress: ExportProgress = (p, label) => {
          setExportProgress(0.45 + p * 0.55);
          if (label) setExportLabel(label);
        };

        let blob: Blob;
        if (format === "gif") {
          blob = await encodeGIF(frames, winW, winH, fps, onProgress);
          downloadBlob(blob, `scattered-animation-${Date.now()}.gif`);
        } else {
          blob = await encodeMP4(frames, fps, onProgress);
          downloadBlob(blob, `scattered-animation-${Date.now()}.mp4`);
        }
      } catch (err) {
        console.error("Export failed:", err);
        alert("Export failed. Check the browser console for details.");
      } finally {
        setIsExporting(false);
        setExportProgress(0);
        setExportLabel("");
        showFinalState();
      }
    },
    [
      isExporting,
      fps,
      winW,
      winH,
      stopAnimation,
      applyStatesToDOM,
      showFinalState,
    ],
  );

  // Select effect (triggers auto-play via useEffect)
  const handleSelectEffect = useCallback((effect: AnimationEffect) => {
    setSelectedEffect(effect);
  }, []);

  // ── Background style (mirrors App.tsx logic) ──────────────────────

  const bgStyle = useMemo((): React.CSSProperties => {
    if (background.type === "color")
      return { backgroundColor: background.value };
    if (background.type === "image")
      return {
        backgroundImage: `url(${background.value})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    return {
      backgroundColor: "#1a1a1a",
      backgroundImage: `radial-gradient(circle at center, #2d2d2d 0%, #1a1a1a 100%)`,
      backgroundBlendMode: "overlay",
    };
  }, [background]);

  // ── Render ─────────────────────────────────────────────────────────

  const totalDurDisplay = (plan.totalDuration / speed).toFixed(1);

  // Preview dimensions: window fills 90% of viewport width
  const CONTROLS_W = 280;
  const WINDOW_W = Math.round(winW * 0.9);
  const PREVIEW_W = WINDOW_W - CONTROLS_W;
  const previewScale = PREVIEW_W / winW; // width-driven; height follows aspect ratio
  const PREVIEW_H = Math.round(winH * previewScale);
  const WINDOW_H = PREVIEW_H + 44; // 44px for the title bar

  return (
    <>
      {/* Dim backdrop — clicking outside closes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-99998"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Floating glass window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="fixed z-99999 rounded-2xl overflow-hidden flex flex-col"
        style={{
          top: `calc(50% - ${WINDOW_H / 2}px)`,
          left: `calc(50% - ${WINDOW_W / 2}px)`,
          width: WINDOW_W,
          height: WINDOW_H,
          background: "rgba(10, 10, 16, 0.55)",
          backdropFilter: "blur(48px) saturate(1.6)",
          WebkitBackdropFilter: "blur(48px) saturate(1.6)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow:
            "0 40px 100px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.05) inset",
        }}
      >
        {/* ── Title bar (drag handle) ── */}
        <div
          className="shrink-0 flex items-center justify-between px-4 select-none"
          style={{
            height: 44,
            background: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* macOS-style dots */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <span className="text-white/35 text-[11px] font-medium tracking-wide">
              Animation Preview
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-white/25 text-[10px] font-mono">
              {photos.length} photos · {totalDurDisplay}s
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-white/35 hover:text-white/80 hover:bg-white/10 transition-all"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">
          {/* Preview pane */}
          <div
            className="relative shrink-0 overflow-hidden"
            style={{
              width: PREVIEW_W,
              height: PREVIEW_H,
              background: "rgba(0,0,0,0.25)",
            }}
          >
            {/* Preview wrapper (scaled visually) */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: winW,
                height: winH,
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
              }}
            >
              {/* Full-size export canvas (unscaled) */}
              <div
                ref={canvasRef}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: winW,
                  height: winH,
                  ...bgStyle,
                }}
              >
                {background.type === "default" && (
                  <div className="absolute inset-0 pointer-events-none bg-black/20" />
                )}
                {photos.map((photo) => (
                  <PreviewCard
                    key={photo.id}
                    photo={photo}
                    domRef={(el) => {
                      if (el) photoRefsRef.current.set(photo.id, el);
                      else photoRefsRef.current.delete(photo.id);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Resolution badge */}
            <div className="absolute bottom-2 left-2.5 text-white/25 text-[9px] font-mono select-none pointer-events-none no-export">
              {winW}×{winH}
            </div>
          </div>

          {/* Controls panel */}
          <div
            className="flex flex-col overflow-y-auto no-export"
            style={{
              width: CONTROLS_W,
              borderLeft: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex flex-col gap-4 p-4">
              {/* Effect selector */}
              <div>
                <label className="text-white/40 text-[9px] font-bold uppercase tracking-widest block mb-2">
                  Effect
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {EFFECTS.map((eff) => (
                    <button
                      key={eff.id}
                      onClick={() => handleSelectEffect(eff.id)}
                      className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-xl border text-left transition-all ${
                        selectedEffect === eff.id
                          ? "bg-white/88 text-black border-white/70"
                          : "text-white/65 hover:text-white/90 hover:bg-white/8 hover:border-white/15"
                      }`}
                      style={{
                        background:
                          selectedEffect === eff.id
                            ? "rgba(255,255,255,0.88)"
                            : "rgba(255,255,255,0.04)",
                        borderColor:
                          selectedEffect === eff.id
                            ? "rgba(255,255,255,0.7)"
                            : "rgba(255,255,255,0.08)",
                      }}
                    >
                      <span className="text-sm leading-none">{eff.emoji}</span>
                      <span className="text-[11px] font-semibold mt-1">
                        {eff.label}
                      </span>
                      <span
                        className={`text-[9px] leading-tight ${
                          selectedEffect === eff.id
                            ? "text-black/45"
                            : "text-white/35"
                        }`}
                      >
                        {eff.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed */}
              <div>
                <label className="text-white/40 text-[9px] font-bold uppercase tracking-widest block mb-2">
                  Speed · {speed.toFixed(1)}×
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-0.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-[9px] text-white/25 mt-1">
                  <span>0.5×</span>
                  <span>2×</span>
                </div>
              </div>

              {/* Playback */}
              <div>
                <label className="text-white/40 text-[9px] font-bold uppercase tracking-widest block mb-2">
                  Playback
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handlePlayPause}
                    disabled={isExporting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "rgba(255,255,255,0.85)",
                    }}
                  >
                    {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  <button
                    onClick={handleReplay}
                    disabled={isExporting}
                    className="p-2 rounded-xl transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.55)",
                    }}
                    title="Replay from start"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>

              <div
                style={{ height: 1, background: "rgba(255,255,255,0.07)" }}
              />

              {/* Export */}
              <div>
                <label className="text-white/40 text-[9px] font-bold uppercase tracking-widest block mb-1.5">
                  Export
                </label>
                <div className="flex gap-1 mb-2">
                  {([15, 24, 30] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFps(f)}
                      disabled={isExporting}
                      className="flex-1 py-1 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40"
                      style={{
                        background:
                          fps === f
                            ? "rgba(255,255,255,0.14)"
                            : "rgba(255,255,255,0.04)",
                        border:
                          fps === f
                            ? "1px solid rgba(255,255,255,0.22)"
                            : "1px solid rgba(255,255,255,0.07)",
                        color:
                          fps === f
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {f} fps
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => handleExport("gif")}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(168,85,247,0.18)",
                      border: "1px solid rgba(168,85,247,0.28)",
                      color: "rgba(216,180,254,0.9)",
                    }}
                  >
                    {isExporting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    Export GIF
                  </button>
                  <button
                    onClick={() => handleExport("mp4")}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(59,130,246,0.18)",
                      border: "1px solid rgba(59,130,246,0.28)",
                      color: "rgba(147,197,253,0.9)",
                    }}
                  >
                    {isExporting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    Export MP4
                  </button>
                </div>

                <AnimatePresence>
                  {isExporting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="flex justify-between text-[9px] text-white/45 mb-1.5">
                        <span>{exportLabel || "Processing…"}</span>
                        <span>{Math.round(exportProgress * 100)}%</span>
                      </div>
                      <div
                        className="rounded-full overflow-hidden"
                        style={{
                          height: 2,
                          background: "rgba(255,255,255,0.08)",
                        }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            width: `${exportProgress * 100}%`,
                            background: "rgba(255,255,255,0.5)",
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-[9px] text-white/25 mt-1.5 leading-tight">
                        {exportProgress < 0.45
                          ? "Capturing frames…"
                          : "Encoding — this may take a moment."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
