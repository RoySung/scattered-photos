import { toPng } from "html-to-image";
// Vite resolves this at build time to the correct hashed asset URL
import gifWorkerUrl from "gif.js/dist/gif.worker.js?url";

export type ExportProgress = (progress: number, label?: string) => void;

// ─── Frame capture ───────────────────────────────────────────────────

/**
 * Capture a PNG snapshot of `el`, passing the given filter.
 * Returns a data-URL string.
 */
export async function captureFrame(
  el: HTMLElement,
  width: number,
  height: number,
): Promise<string> {
  return toPng(el, {
    width,
    height,
    quality: 0.92,
    pixelRatio: 1,
    filter: (node) => !node.classList?.contains("no-export"),
  });
}

// ─── GIF encoding ───────────────────────────────────────────────────

function dataUrlToImageData(
  dataUrl: string,
  w: number,
  h: number,
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(ctx.getImageData(0, 0, w, h));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Encode an array of base64-PNG data URLs into an animated GIF Blob.
 * Uses gif.js with a web-worker sourced from the npm package.
 */
export async function encodeGIF(
  frames: string[],
  width: number,
  height: number,
  fps: number,
  onProgress?: ExportProgress,
): Promise<Blob> {
  // Dynamically import gif.js to keep initial bundle lighter
  const GIF = (await import("gif.js")).default;

  const delay = Math.round(1000 / fps);

  const gif = new GIF({
    workers: 2,
    quality: 8,
    width,
    height,
    // gifWorkerUrl is resolved by Vite at build time — avoids 404 in production
    workerScript: gifWorkerUrl,
  });

  onProgress?.(0, "Processing frames…");

  for (let i = 0; i < frames.length; i++) {
    const imgData = await dataUrlToImageData(frames[i], width, height);
    gif.addFrame(imgData, { delay });
    onProgress?.(((i + 1) / frames.length) * 0.5, "Processing frames…");
  }

  return new Promise((resolve, reject) => {
    // Safety timeout: if gif.js stalls (worker crash / bad URL), reject after 60 s
    const safetyTimer = setTimeout(
      () => reject(new Error("GIF encoding timed out after 60 s")),
      60_000,
    );
    gif.on("progress", (p: number) => {
      onProgress?.(0.5 + p * 0.5, "Encoding GIF…");
    });
    gif.on("finished", (blob: Blob) => {
      clearTimeout(safetyTimer);
      resolve(blob);
    });
    gif.on("error", (err: unknown) => {
      clearTimeout(safetyTimer);
      reject(err);
    });
    gif.render();
  });
}

// ─── MP4 encoding ────────────────────────────────────────────────────

/**
 * Convert a base64 data URL to a Blob without going through fetch().
 * Using atob + Uint8Array is synchronous and avoids a network round-trip.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const mime = dataUrl.slice(5, dataUrl.indexOf(";"));
  const bstr = atob(dataUrl.slice(comma + 1));
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

/**
 * Pick an AVC codec string appropriate for the given resolution.
 * Each H.264 level caps the maximum coded area (luma samples per frame).
 */
function avcCodecForSize(w: number, h: number): string {
  const area = w * h;
  if (area <= 921_600)   return "avc1.42001f"; // Level 3.1 — ≤ 1280×720
  if (area <= 2_097_152) return "avc1.420029"; // Level 4.1 — ≤ 1920×1080
  if (area <= 9_437_184) return "avc1.420033"; // Level 5.1 — ≤ 4096×2304
  return "avc1.420034";                        // Level 5.2 — beyond 4K
}

/**
 * Encode frames into an MP4 Blob using the browser-native WebCodecs API
 * (hardware-accelerated H.264, no WASM download required).
 *
 * Supported: Chrome 94+, Edge 94+, Safari 16.4+
 * For unsupported browsers an explanatory error is thrown.
 */
export async function encodeMP4(
  frames: string[],
  fps: number,
  onProgress?: ExportProgress,
): Promise<Blob> {
  onProgress?.(0, "Preparing encoder…");

  if (typeof VideoEncoder === "undefined") {
    throw new Error(
      "MP4 export requires the WebCodecs API, which is not supported in this browser.\n" +
      "Please use Chrome 94+, Edge 94+, or Safari 16.4+."
    );
  }

  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");

  onProgress?.(0.01, "Preparing encoder…");

  // Decode first frame to get render dimensions
  const firstBitmap = await createImageBitmap(dataUrlToBlob(frames[0]));
  const rawW = firstBitmap.width;
  const rawH = firstBitmap.height;
  firstBitmap.close();

  // H.264 requires even dimensions
  const encW = rawW % 2 === 0 ? rawW : rawW - 1;
  const encH = rawH % 2 === 0 ? rawH : rawH - 1;

  const codec = avcCodecForSize(encW, encH);

  // Verify hardware support before committing
  const { supported } = await VideoEncoder.isConfigSupported({
    codec,
    width: encW,
    height: encH,
  });
  if (!supported) {
    throw new Error(
      `H.264 encoding is not supported at ${encW}×${encH} on this device.`
    );
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: encW, height: encH },
    fastStart: "in-memory",
  });

  let encodeError: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encodeError = e; },
  });

  encoder.configure({
    codec,
    width: encW,
    height: encH,
    bitrate: 8_000_000,
    framerate: fps,
    avc: { format: "avc" },
  });

  const canvas = document.createElement("canvas");
  canvas.width = encW;
  canvas.height = encH;
  const ctx = canvas.getContext("2d")!;
  const frameDuration = 1_000_000 / fps; // microseconds

  for (let i = 0; i < frames.length; i++) {
    if (encodeError) throw encodeError;

    const bitmap = await createImageBitmap(dataUrlToBlob(frames[i]));
    ctx.drawImage(bitmap, 0, 0, encW, encH);
    bitmap.close();

    // Back-pressure: wait for encoder to drain before queuing more frames
    // (threshold of 3 keeps GPU pipeline full without unbounded memory growth)
    while (encoder.encodeQueueSize > 3) {
      await new Promise<void>((r) => setTimeout(r, 8));
    }

    if (encodeError) throw encodeError;

    const videoFrame = new VideoFrame(canvas, {
      timestamp: Math.round(i * frameDuration),
      duration: Math.round(frameDuration),
    });
    try {
      encoder.encode(videoFrame, { keyFrame: i % 30 === 0 });
    } finally {
      // Safe to close immediately — encoder holds its own internal reference
      videoFrame.close();
    }

    onProgress?.((i + 1) / frames.length, "Encoding MP4…");
    // Yield one macrotask per frame so React can repaint the progress bar
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  await encoder.flush();
  if (encodeError) throw encodeError;
  encoder.close();
  muxer.finalize();

  onProgress?.(1, "Done");
  return new Blob([target.buffer], { type: "video/mp4" });
}

// ─── Download helper ─────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
