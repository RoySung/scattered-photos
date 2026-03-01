export interface Photo {
  id: string;
  url: string;
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
  scale: number;
  width?: number;
  height?: number;
  timestamp: number;
}

export interface Position {
  x: number;
  y: number;
}

export type BackgroundType = "default" | "color" | "image";

export interface BackgroundSettings {
  type: BackgroundType;
  value: string;
}

// ─── Animation types ────────────────────────────────────────────────
export type AnimationEffect = "sequential" | "shuffle" | "flip" | "fade";

export interface AnimationConfig {
  effect: AnimationEffect;
  speed: number; // multiplier: 0.5 – 2.0
  fps: 15 | 24 | 30;
}

/** Snapshot of a single photo's visual state at one animation frame */
export interface PhotoAnimState {
  id: string;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  scale: number;
  rotateY: number; // for flip effect
}
