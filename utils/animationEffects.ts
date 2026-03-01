import { Photo, AnimationEffect, PhotoAnimState } from "../types";

/** Per-photo animation specification */
export interface PhotoEnterSpec {
  photoId: string;
  from: Omit<PhotoAnimState, "id">;
  to: Omit<PhotoAnimState, "id">;
  delay: number; // seconds
  duration: number; // seconds
}

export interface EffectPlan {
  specs: PhotoEnterSpec[];
  totalDuration: number; // seconds (at speed = 1.0)
}

const defaultFrom = (): Omit<PhotoAnimState, "id"> => ({
  x: 0,
  y: 0,
  rotation: 0,
  opacity: 1,
  scale: 1,
  rotateY: 0,
});

function toState(photo: Photo): Omit<PhotoAnimState, "id"> {
  return {
    x: photo.x,
    y: photo.y,
    rotation: photo.rotation,
    opacity: 1,
    scale: photo.scale,
    rotateY: 0,
  };
}

/**
 * Build an EffectPlan for the given photos and effect type.
 * All timings are in seconds at speed = 1.0.
 */
export function buildEffectPlan(
  photos: Photo[],
  effect: AnimationEffect,
  containerWidth: number,
  containerHeight: number,
): EffectPlan {
  // Sort photos by zIndex so they enter in layer order
  const sorted = [...photos].sort((a, b) => a.zIndex - b.zIndex);

  const specs: PhotoEnterSpec[] = [];

  switch (effect) {
    case "sequential": {
      // Each photo flies in from the top, one by one
      const stagger = 0.35;
      const enterDur = 0.8;
      sorted.forEach((photo, i) => {
        specs.push({
          photoId: photo.id,
          from: {
            ...defaultFrom(),
            x: photo.x,
            y: -350,
            rotation: photo.rotation * 0.5,
            opacity: 0,
            scale: photo.scale * 0.8,
            rotateY: 0,
          },
          to: toState(photo),
          delay: i * stagger,
          duration: enterDur,
        });
      });
      const last =
        sorted.length > 0 ? (sorted.length - 1) * stagger + enterDur : 1;
      return { specs, totalDuration: last };
    }

    case "shuffle": {
      // All photos start stacked at centre, then scatter out
      const cx = containerWidth / 2 - 110;
      const cy = containerHeight / 2 - 140;
      const gatherDur = 0.5;
      const scatterStagger = 0.12;
      const scatterDur = 0.7;

      sorted.forEach((photo, i) => {
        // Phase 1: gather to centre (all together)
        specs.push({
          photoId: photo.id,
          from: {
            ...toState(photo),
            x: cx,
            y: cy,
            rotation: (i % 2 === 0 ? 1 : -1) * (i * 3),
            opacity: 0,
            scale: photo.scale * 0.9,
            rotateY: 0,
          },
          to: toState(photo),
          // Stagger the scatter slightly
          delay: gatherDur + i * scatterStagger,
          duration: scatterDur,
        });
      });
      const last =
        gatherDur + (sorted.length - 1) * scatterStagger + scatterDur;
      return { specs, totalDuration: Math.max(last, 1) };
    }

    case "flip": {
      // Each photo flips in (rotateY 90→0) one by one
      const stagger = 0.3;
      const enterDur = 0.6;
      sorted.forEach((photo, i) => {
        specs.push({
          photoId: photo.id,
          from: {
            ...toState(photo),
            opacity: 0,
            scale: photo.scale * 0.9,
            rotateY: 90,
          },
          to: toState(photo),
          delay: i * stagger,
          duration: enterDur,
        });
      });
      const last = (sorted.length - 1) * stagger + enterDur;
      return { specs, totalDuration: Math.max(last, 1) };
    }

    case "fade": {
      // Each photo fades + scales up into position
      const stagger = 0.28;
      const enterDur = 0.7;
      sorted.forEach((photo, i) => {
        specs.push({
          photoId: photo.id,
          from: {
            ...toState(photo),
            opacity: 0,
            scale: photo.scale * 0.7,
            rotateY: 0,
          },
          to: toState(photo),
          delay: i * stagger,
          duration: enterDur,
        });
      });
      const last = (sorted.length - 1) * stagger + enterDur;
      return { specs, totalDuration: Math.max(last, 1) };
    }
  }
}

// ─── Interpolation helpers (for frame capture) ──────────────────────

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Given an EffectPlan and a time t (seconds), return the visual state
 * of every photo. Used for deterministic frame capture.
 */
export function interpolateFrame(
  plan: EffectPlan,
  photos: Photo[],
  t: number,
  effect: AnimationEffect,
): PhotoAnimState[] {
  const easeFn = effect === "sequential" ? easeOutBack : easeOutQuart;

  return plan.specs.map((spec) => {
    const photo = photos.find((p) => p.id === spec.photoId);
    if (!photo) {
      return { id: spec.photoId, ...spec.to };
    }

    const localT = (t - spec.delay) / spec.duration;
    if (localT <= 0) {
      return { id: spec.photoId, ...spec.from };
    }
    if (localT >= 1) {
      return { id: spec.photoId, ...spec.to };
    }

    const eased = easeFn(Math.min(localT, 1));
    return {
      id: spec.photoId,
      x: lerp(spec.from.x, spec.to.x, eased),
      y: lerp(spec.from.y, spec.to.y, eased),
      rotation: lerp(spec.from.rotation, spec.to.rotation, eased),
      opacity: lerp(spec.from.opacity, spec.to.opacity, eased),
      scale: lerp(spec.from.scale, spec.to.scale, eased),
      rotateY: lerp(spec.from.rotateY, spec.to.rotateY, eased),
    };
  });
}
