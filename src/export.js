import { getSupportedVideoType, supportsVideoExport } from './animation.js';
import { getExportDimensions, renderArtworkSvg } from './renderer.js';

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

export async function exportVideo(state, { onProgress } = {}) {
  if (!supportsVideoExport()) {
    throw new Error('Video export is not supported by this browser.');
  }

  const { width, height } = getExportDimensions(state);
  const duration = clamp(Number(state.animationDuration) || 6, 2, 20);
  const fps = clamp(Number(state.animationFps) || 30, 12, 60);
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const frameDelay = 1000 / fps;
  const { mimeType, extension, requestedExtension } = getSupportedVideoType(state.animationFormat);
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
