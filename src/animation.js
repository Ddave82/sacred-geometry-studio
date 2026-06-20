export const ANIMATION_PRESETS = [
  {
    id: 'cosmic-spin',
    label: 'Cosmic Spin',
  },
  {
    id: 'breathing-mandala',
    label: 'Breathing Mandala',
  },
  {
    id: 'orbital-overlay',
    label: 'Orbital Overlay',
  },
  {
    id: 'pulse-bloom',
    label: 'Pulse Bloom',
  },
  {
    id: 'slow-reveal',
    label: 'Slow Reveal',
  },
];

const MIME_CANDIDATES = {
  webm: ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'],
  mp4: [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs="avc1.42E01E"',
    'video/mp4; codecs="avc1.42E01E"',
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=h264',
    'video/mp4',
  ],
};

export function getAnimatedState(state, timeSeconds = 0) {
  const duration = clamp(Number(state.animationDuration) || 6, 2, 20);
  const strength = clamp(Number(state.animationStrength) || 0, 0, 100) / 100;
  if (strength <= 0) return state;

  const progress = normalizedProgress(timeSeconds, duration);
  const cycle = Math.sin(progress * Math.PI * 2);
  const pulse = (cycle + 1) / 2;
  const animated = { ...state };

  switch (state.animationPreset) {
    case 'breathing-mandala':
      animated.scale = clamp(state.scale + cycle * 7 * strength, 45, 130);
      animated.overlayScale = clamp(state.overlayScale - cycle * 10 * strength, 20, 210);
      animated.glowStrength = clamp(state.glowStrength + pulse * 3.5 * strength, 0, 18);
      animated.fillOpacity = clamp(state.fillOpacity + pulse * 0.08 * strength, 0, 0.55);
      break;
    case 'orbital-overlay':
      animated.rotation = wrapDegrees(state.rotation + progress * 48 * strength);
      animated.overlayRotation = wrapDegrees(state.overlayRotation - progress * 360 * strength);
      animated.overlayOpacity = clamp(state.overlayOpacity + cycle * 0.08 * strength, 0.02, 0.85);
      break;
    case 'pulse-bloom':
      animated.glowStrength = clamp(state.glowStrength + pulse * 6 * strength, 0, 20);
      animated.strokeOpacity = clamp(state.strokeOpacity - 0.1 * strength + pulse * 0.18 * strength, 0.12, 1);
      animated.fillOpacity = clamp(state.fillOpacity + pulse * 0.14 * strength, 0, 0.62);
      animated.overlayOpacity = clamp(state.overlayOpacity + pulse * 0.12 * strength, 0.02, 0.9);
      break;
    case 'slow-reveal':
      animated.rotation = wrapDegrees(state.rotation + progress * 95 * strength);
      animated.strokeOpacity = clamp(state.strokeOpacity * (0.48 + pulse * 0.58 * strength), 0.08, 1);
      animated.overlayOpacity = clamp(state.overlayOpacity * (0.36 + pulse * 0.74 * strength), 0.02, 0.9);
      animated.glowStrength = clamp(state.glowStrength + cycle * 2.8 * strength, 0, 18);
      break;
    case 'cosmic-spin':
    default:
      animated.rotation = wrapDegrees(state.rotation + progress * 360 * strength);
      animated.overlayRotation = wrapDegrees(state.overlayRotation - progress * 234 * strength);
      animated.glowStrength = clamp(state.glowStrength + pulse * 2.5 * strength, 0, 18);
      break;
  }

  return animated;
}

export function getSupportedVideoType(preferredFormat = 'webm', { allowFallback = false } = {}) {
  const format = preferredFormat === 'mp4' ? 'mp4' : 'webm';
  const preferred = MIME_CANDIDATES[format] ?? MIME_CANDIDATES.webm;
  const fallback = format === 'mp4' ? MIME_CANDIDATES.webm : MIME_CANDIDATES.mp4;
  const candidates = allowFallback ? [...preferred, ...fallback] : preferred;

  if (!globalThis.MediaRecorder?.isTypeSupported) {
    return { mimeType: '', extension: format, requestedExtension: format, supported: false };
  }

  const mimeType = candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
  const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
  return { mimeType, extension, requestedExtension: format, supported: Boolean(mimeType) };
}

export function supportsVideoExport() {
  return Boolean(globalThis.MediaRecorder && globalThis.HTMLCanvasElement?.prototype.captureStream);
}

function normalizedProgress(timeSeconds, duration) {
  return ((timeSeconds % duration) + duration) % duration / duration;
}

function clamp(value, min, max) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

function wrapDegrees(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 0;
  return ((numeric % 360) + 360) % 360;
}
