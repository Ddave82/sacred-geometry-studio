import { getSupportedVideoType, supportsVideoExport } from './animation.js';
import { collectPaletteSamples, createAdaptivePalette, createGifEncoder, createPaletteMapper } from './gif.js';
import { getExportDimensions, renderArtworkSvg } from './renderer.js';

const GIF_MAX_FRAMES = 180;
const GIF_MIN_FPS = 2;
const GIF_MAX_FPS = 24;
const GIF_MIN_SIZE = 320;
const GIF_MAX_SIZE = 2048;

export function exportSvg(state) {
  const { width, height } = getExportDimensions(state);
  const svg = renderArtworkSvg(state, { width, height, idPrefix: 'sacred-export' });
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename(state, 'svg'));
}

export async function exportPng(state) {
  const { width, height } = getExportDimensions(state);
  const svg = renderArtworkSvg(state, { width, height, idPrefix: 'sacred-export' });
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    await new Promise((resolve) => {
      canvas.toBlob((pngBlob) => {
        if (pngBlob) downloadBlob(pngBlob, filename(state, 'png'));
        resolve();
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportVideo(state, { format = 'webm', allowFallback = false, onProgress } = {}) {
  if (!supportsVideoExport()) {
    throw new Error('Video export is not supported by this browser.');
  }

  const { width, height } = getExportDimensions(state);
  const duration = clamp(Number(state.animationDuration) || 6, 2, 20);
  const fps = clamp(Number(state.animationFps) || 30, 12, 60);
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const frameDelay = 1000 / fps;
  const { mimeType, extension, requestedExtension, supported } = getSupportedVideoType(format, { allowFallback });
  if (!supported) {
    throw new Error(`${format.toUpperCase()} export is not supported by this browser.`);
  }
  if (format === 'mp4' && extension !== 'mp4') {
    throw new Error('MP4 export is not supported by this browser.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  const stream = canvas.captureStream(0);
  const chunks = [];
  const recorderOptions = {
    videoBitsPerSecond: estimateBitrate(width, height, fps),
  };
  if (mimeType) recorderOptions.mimeType = mimeType;

  const recorder = new MediaRecorder(stream, recorderOptions);
  const completed = new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(recorder.error || new Error('Video export failed.'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' }));
  });

  recorder.start(1000);

  try {
    const [track] = stream.getVideoTracks();
    for (let frame = 0; frame < totalFrames; frame += 1) {
      await drawSvgFrame(context, state, width, height, frame / fps, frame);
      track?.requestFrame?.();
      onProgress?.({
        progress: (frame + 1) / totalFrames,
        extension,
        requestedExtension,
        frame: frame + 1,
        totalFrames,
      });
      await wait(frameDelay);
    }
    recorder.stop();
    const videoBlob = await completed;
    downloadBlob(videoBlob, filename(state, extension));
    return {
      extension,
      mimeType: recorder.mimeType || mimeType || 'video/webm',
      requestedExtension,
      width,
      height,
    };
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

export async function exportGif(state, { onProgress } = {}) {
  const gifSize = clamp(Number(state.gifSize) || 960, GIF_MIN_SIZE, GIF_MAX_SIZE);
  const { width, height } = getCappedDimensions(getExportDimensions(state), gifSize);
  const duration = clamp(Number(state.animationDuration) || 6, 2, 20);
  const requestedFps = clamp(Number(state.gifFps) || 12, GIF_MIN_FPS, GIF_MAX_FPS);
  const fps = Math.max(GIF_MIN_FPS, Math.min(GIF_MAX_FPS, requestedFps, Math.floor(GIF_MAX_FRAMES / duration)));
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const delayCs = Math.max(2, Math.round(100 / fps));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
  const gifState = { ...state, grain: false };
  const histogram = new Map();
  const sampleStride = getGifSampleStride(width, height, totalFrames);

  for (let frame = 0; frame < totalFrames; frame += 1) {
    await drawSvgFrame(context, gifState, width, height, frame / fps, frame);
    const imageData = context.getImageData(0, 0, width, height);
    collectPaletteSamples(imageData.data, histogram, { stride: sampleStride });
    onProgress?.({
      progress: ((frame + 1) / totalFrames) * 0.28,
      extension: 'gif',
      requestedExtension: 'gif',
      stage: 'palette',
      frame: frame + 1,
      totalFrames,
      fps,
      width,
      height,
    });

    if (frame % 4 === 3) await wait(0);
  }

  const palette = createAdaptivePalette(histogram);
  const mapImageData = createPaletteMapper(palette);
  const encoder = createGifEncoder(width, height, { delayCs, palette });

  for (let frame = 0; frame < totalFrames; frame += 1) {
    await drawSvgFrame(context, gifState, width, height, frame / fps, frame);
    const imageData = context.getImageData(0, 0, width, height);
    encoder.addFrame(mapImageData(imageData.data));
    onProgress?.({
      progress: 0.28 + ((frame + 1) / totalFrames) * 0.72,
      extension: 'gif',
      requestedExtension: 'gif',
      stage: 'encode',
      frame: frame + 1,
      totalFrames,
      fps,
      width,
      height,
    });

    if (frame % 3 === 2) await wait(0);
  }

  const gifBlob = encoder.finish();
  downloadBlob(gifBlob, filename(state, 'gif'));
  return { extension: 'gif', mimeType: 'image/gif', width, height, fps };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function drawSvgFrame(context, state, width, height, animationTime, frame) {
  const svg = renderArtworkSvg(state, {
    width,
    height,
    idPrefix: `sacred-video-${frame}`,
    animationTime,
  });
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function estimateBitrate(width, height, fps) {
  return Math.round(clamp(width * height * fps * 0.08, 4_000_000, 36_000_000));
}

function getCappedDimensions({ width, height }, maxDimension) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function getGifSampleStride(width, height, totalFrames) {
  const targetSamples = 180_000;
  return Math.max(1, Math.ceil((width * height * totalFrames) / targetSamples));
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function clamp(value, min, max) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

function filename(state, extension) {
  const seed = String(state.seed || 'design').replace(/[^a-z0-9-]+/gi, '-').replace(/(^-|-$)/g, '');
  return `sacred-geometry-${seed}.${extension}`;
}
