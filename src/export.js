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

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
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
