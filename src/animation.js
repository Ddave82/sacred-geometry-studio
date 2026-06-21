export const ANIMATION_PRESETS = [
  {
    id: 'geometry-bloom',
    label: 'Geometry Bloom',
  },
  {
    id: 'harmonic-weave',
    label: 'Harmonic Weave',
  },
  {
    id: 'lattice-morph',
    label: 'Lattice Morph',
  },
  {
    id: 'temple-breath',
    label: 'Temple Breath',
  },
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
  const phase = progress * Math.PI * 2;
  const cycle = Math.sin(progress * Math.PI * 2);
  const pulse = (cycle + 1) / 2;
  const animated = {
    ...state,
    motion: createGeometryMotion(state.animationPreset, progress, strength),
  };

  switch (state.animationPreset) {
    case 'geometry-bloom':
      animated.scale = clamp(state.scale + cycle * 4.5 * strength, 45, 130);
      animated.overlayScale = clamp(state.overlayScale + Math.sin(progress * Math.PI * 4) * 7 * strength, 20, 220);
      animated.rotation = wrapDegrees(state.rotation + Math.sin(phase * 2) * 24 * strength);
      animated.overlayRotation = wrapDegrees(state.overlayRotation - Math.sin(phase) * 48 * strength);
      animated.glowStrength = clamp(state.glowStrength + pulse * 4 * strength, 0, 20);
      animated.fillOpacity = clamp(state.fillOpacity + pulse * 0.08 * strength, 0, 0.58);
      break;
    case 'harmonic-weave':
      animated.rotation = wrapDegrees(state.rotation + Math.sin(progress * Math.PI * 2) * 24 * strength);
      animated.overlayRotation = wrapDegrees(state.overlayRotation - loopTurns(progress, 1));
      animated.overlayOpacity = clamp(state.overlayOpacity + Math.sin(progress * Math.PI * 4) * 0.08 * strength, 0.02, 0.85);
      animated.glowStrength = clamp(state.glowStrength + pulse * 2.8 * strength, 0, 18);
      break;
    case 'lattice-morph':
      animated.scale = clamp(state.scale + Math.sin(progress * Math.PI * 4) * 5 * strength, 45, 132);
      animated.overlayScale = clamp(state.overlayScale - cycle * 12 * strength, 20, 220);
      animated.rotation = wrapDegrees(state.rotation + loopTurns(progress, 1));
      animated.overlayRotation = wrapDegrees(state.overlayRotation + loopTurns(progress, 2));
      animated.strokeOpacity = clamp(state.strokeOpacity - 0.05 * strength + pulse * 0.09 * strength, 0.12, 1);
      break;
    case 'temple-breath':
      animated.scale = clamp(state.scale + cycle * 8 * strength, 45, 132);
      animated.overlayScale = clamp(state.overlayScale - cycle * 5 * strength, 20, 220);
      animated.glowStrength = clamp(state.glowStrength + pulse * 5.2 * strength, 0, 20);
      animated.fillOpacity = clamp(state.fillOpacity + pulse * 0.1 * strength, 0, 0.62);
      break;
    case 'breathing-mandala':
      animated.scale = clamp(state.scale + cycle * 7 * strength, 45, 130);
      animated.overlayScale = clamp(state.overlayScale - cycle * 10 * strength, 20, 210);
      animated.glowStrength = clamp(state.glowStrength + pulse * 3.5 * strength, 0, 18);
      animated.fillOpacity = clamp(state.fillOpacity + pulse * 0.08 * strength, 0, 0.55);
      break;
    case 'orbital-overlay':
      animated.rotation = wrapDegrees(state.rotation + loopTurns(progress, 1));
      animated.overlayRotation = wrapDegrees(state.overlayRotation - loopTurns(progress, 1));
      animated.overlayOpacity = clamp(state.overlayOpacity + cycle * 0.08 * strength, 0.02, 0.85);
      break;
    case 'pulse-bloom':
      animated.glowStrength = clamp(state.glowStrength + pulse * 6 * strength, 0, 20);
      animated.strokeOpacity = clamp(state.strokeOpacity - 0.1 * strength + pulse * 0.18 * strength, 0.12, 1);
      animated.fillOpacity = clamp(state.fillOpacity + pulse * 0.14 * strength, 0, 0.62);
      animated.overlayOpacity = clamp(state.overlayOpacity + pulse * 0.12 * strength, 0.02, 0.9);
      break;
    case 'slow-reveal':
      animated.rotation = wrapDegrees(state.rotation + loopTurns(progress, 1));
      animated.strokeOpacity = clamp(state.strokeOpacity * (0.48 + pulse * 0.58 * strength), 0.08, 1);
      animated.overlayOpacity = clamp(state.overlayOpacity * (0.36 + pulse * 0.74 * strength), 0.02, 0.9);
      animated.glowStrength = clamp(state.glowStrength + cycle * 2.8 * strength, 0, 18);
      break;
    case 'cosmic-spin':
    default:
      animated.rotation = wrapDegrees(state.rotation + loopTurns(progress, 1));
      animated.overlayRotation = wrapDegrees(state.overlayRotation - loopTurns(progress, 1));
      animated.glowStrength = clamp(state.glowStrength + pulse * 2.5 * strength, 0, 18);
      break;
  }

  return animated;
}

function createGeometryMotion(preset, progress, strength) {
  const phase = progress * Math.PI * 2;
  const cycle = Math.sin(phase);
  const pulse = (cycle + 1) / 2;
  const double = Math.sin(phase * 2);
  const triple = Math.sin(phase * 3);
  const base = {
    preset,
    strength,
    phase,
    cycle,
    pulse,
    radialWave: 0.015 * strength,
    radiusWave: 0.018 * strength,
    nodeWave: 0.012 * strength,
    twistDegrees: 0,
    layerPhase: phase,
    petalWave: 0.02 * strength,
    angleWave: 0,
  };

  switch (preset) {
    case 'geometry-bloom':
      return {
        ...base,
        radialWave: 0.075 * strength,
        radiusWave: 0.065 * strength,
        nodeWave: 0.055 * strength,
        twistDegrees: 9 * double * strength,
        petalWave: 0.1 * strength,
        angleWave: 8 * cycle * strength,
      };
    case 'harmonic-weave':
      return {
        ...base,
        radialWave: 0.045 * strength,
        radiusWave: 0.035 * strength,
        nodeWave: 0.075 * strength,
        twistDegrees: 16 * cycle * strength,
        petalWave: 0.075 * strength,
        angleWave: 16 * double * strength,
      };
    case 'lattice-morph':
      return {
        ...base,
        radialWave: 0.09 * strength,
        radiusWave: 0.045 * strength,
        nodeWave: 0.095 * strength,
        twistDegrees: 22 * triple * strength,
        petalWave: 0.085 * strength,
        angleWave: 18 * cycle * strength,
      };
    case 'temple-breath':
      return {
        ...base,
        radialWave: 0.035 * strength,
        radiusWave: 0.09 * strength,
        nodeWave: 0.03 * strength,
        twistDegrees: 4 * cycle * strength,
        petalWave: 0.12 * strength,
        angleWave: 5 * double * strength,
      };
    case 'breathing-mandala':
      return {
        ...base,
        radialWave: 0.045 * strength,
        radiusWave: 0.075 * strength,
        petalWave: 0.095 * strength,
        angleWave: 6 * cycle * strength,
      };
    case 'orbital-overlay':
      return {
        ...base,
        radialWave: 0.02 * strength,
        nodeWave: 0.04 * strength,
        twistDegrees: 12 * cycle * strength,
        angleWave: 14 * strength,
      };
    case 'pulse-bloom':
      return {
        ...base,
        radialWave: 0.055 * strength,
        radiusWave: 0.1 * strength,
        nodeWave: 0.04 * strength,
        petalWave: 0.11 * strength,
      };
    case 'slow-reveal':
      return {
        ...base,
        radialWave: 0.025 * strength,
        radiusWave: 0.035 * strength,
        twistDegrees: 7 * cycle * strength,
        petalWave: 0.045 * strength,
      };
    case 'cosmic-spin':
    default:
      return {
        ...base,
        radialWave: 0.03 * strength,
        radiusWave: 0.025 * strength,
        nodeWave: 0.035 * strength,
        twistDegrees: 10 * cycle * strength,
        angleWave: 10 * strength,
      };
  }
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

function loopTurns(progress, turns = 1) {
  return progress * 360 * turns;
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
