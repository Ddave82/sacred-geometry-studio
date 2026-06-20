import { ANIMATION_PRESETS } from './animation.js';

export const PATTERNS = [
  {
    id: 'flower-of-life',
    label: 'Flower of Life',
    description:
      'Flower of Life is built from evenly spaced overlapping circles arranged in a hexagonal structure.',
  },
  {
    id: 'seed-of-life',
    label: 'Seed of Life',
    description:
      'Seed of Life uses seven interlocking circles to form a compact radial pattern with strong central balance.',
  },
  {
    id: 'metatrons-cube',
    label: "Metatron's Cube",
    description:
      "Metatron's Cube connects a field of thirteen circles with straight lines, revealing nested polygons.",
  },
  {
    id: 'vesica-piscis',
    label: 'Vesica Piscis',
    description:
      'Vesica Piscis comes from two overlapping circles whose shared lens creates a precise geometric center.',
  },
  {
    id: 'sri-yantra',
    label: 'Sri Yantra Inspired',
    description:
      'This Sri Yantra inspired pattern layers interlocking triangles around a quiet central point.',
  },
  {
    id: 'radial-mandala',
    label: 'Radial Mandala',
    description:
      'Radial mandalas repeat petal and ring geometry around a center using a consistent symmetry count.',
  },
  {
    id: 'star-grid',
    label: 'Star Polygon Grid',
    description:
      'Star polygon grids connect evenly spaced points around concentric rings to create angular sacred stars.',
  },
];

export const BACKGROUND_PRESETS = [
  {
    id: 'solid',
    label: 'Solid Color',
    type: 'solid',
    colors: ['#0c0d12', '#0c0d12'],
  },
  {
    id: 'linear-gradient',
    label: 'Linear Gradient',
    type: 'linear',
    colors: ['#090a11', '#202242'],
  },
  {
    id: 'radial-gradient',
    label: 'Radial Gradient',
    type: 'radial',
    colors: ['#17132c', '#05050a'],
  },
  {
    id: 'cosmic-dark',
    label: 'Cosmic Dark Gradient',
    type: 'cosmic',
    colors: ['#120f25', '#02040b'],
  },
  {
    id: 'black-paper',
    label: 'Black Paper',
    type: 'paper-dark',
    colors: ['#10100d', '#030303'],
  },
  {
    id: 'paper-light',
    label: 'Paper',
    type: 'paper-light',
    colors: ['#e7dcc6', '#bfae8d'],
  },
  {
    id: 'white-marble',
    label: 'White Marble',
    type: 'marble',
    colors: ['#f5f0e7', '#c8c1b2'],
  },
  {
    id: 'transparent',
    label: 'Transparent',
    type: 'transparent',
    colors: ['#000000', '#000000'],
  },
];

export const ASPECT_RATIOS = [
  { id: 'square', label: 'Square 1:1', width: 1000, height: 1000 },
  { id: 'portrait', label: 'Portrait 4:5', width: 1000, height: 1250 },
  { id: 'landscape', label: 'Landscape 16:9', width: 1600, height: 900 },
  { id: 'a4', label: 'A4 Portrait', width: 1000, height: 1414 },
];

export const DEFAULT_STATE = {
  moodPreset: 'ancient-gold',
  seed: 'aurea-001',
  pattern: 'flower-of-life',
  complexity: 4,
  scale: 88,
  rotation: 0,
  symmetry: 12,
  strokeWidth: 2.2,
  strokeColor: '#d9a84f',
  secondaryColor: '#7a4b25',
  fillEnabled: true,
  fillOpacity: 0.08,
  strokeOpacity: 0.92,
  glowStrength: 4.5,
  centerEmphasis: true,
  overlayEnabled: true,
  overlayPattern: 'metatrons-cube',
  overlayOpacity: 0.18,
  overlayScale: 80,
  overlayComplexity: 5,
  overlaySymmetry: 12,
  overlayRotation: 30,
  centerSymbolEnabled: true,
  backgroundPreset: 'cosmic-dark',
  backgroundColor1: '#151020',
  backgroundColor2: '#030308',
  vignette: true,
  grain: true,
  aspectRatio: 'square',
  exportSize: 2048,
  animationPreviewEnabled: false,
  animationPreset: 'cosmic-spin',
  animationDuration: 6,
  animationFps: 30,
  animationStrength: 60,
  gifSize: 960,
};

export function createDefaultState() {
  return structuredClone(DEFAULT_STATE);
}

export function getPattern(id) {
  return PATTERNS.find((pattern) => pattern.id === id) ?? PATTERNS[0];
}

export function getBackgroundPreset(id) {
  return BACKGROUND_PRESETS.find((preset) => preset.id === id) ?? BACKGROUND_PRESETS[0];
}

export function getAspectRatio(id) {
  return ASPECT_RATIOS.find((ratio) => ratio.id === id) ?? ASPECT_RATIOS[0];
}

export function patternUsesSymmetry(id) {
  return ['radial-mandala', 'sri-yantra', 'star-grid'].includes(id);
}

export function sanitizeState(input) {
  const state = { ...createDefaultState(), ...input };

  state.complexity = clampNumber(state.complexity, 1, 7);
  state.scale = clampNumber(state.scale, 55, 112);
  state.rotation = wrapDegrees(state.rotation);
  state.symmetry = clampNumber(state.symmetry, 5, 24);
  state.strokeWidth = clampNumber(state.strokeWidth, 0.8, 8);
  state.fillOpacity = clampNumber(state.fillOpacity, 0, 0.45);
  state.strokeOpacity = clampNumber(state.strokeOpacity, 0.2, 1);
  state.glowStrength = clampNumber(state.glowStrength, 0, 14);
  state.overlayOpacity = clampNumber(state.overlayOpacity, 0.08, 0.7);
  state.overlayScale = clampNumber(state.overlayScale, 25, 180);
  state.overlayComplexity = clampNumber(state.overlayComplexity, 1, 7);
  state.overlaySymmetry = clampNumber(state.overlaySymmetry, 5, 24);
  state.overlayRotation = wrapDegrees(state.overlayRotation);
  state.exportSize = [1024, 2048, 4096].includes(Number(state.exportSize)) ? Number(state.exportSize) : 2048;
  state.animationDuration = clampNumber(state.animationDuration, 2, 20);
  state.animationFps = clampNumber(state.animationFps, 12, 60);
  state.animationStrength = clampNumber(state.animationStrength, 0, 100);
  state.gifSize = clampNumber(state.gifSize, 320, 2048);
  state.animationPreviewEnabled = Boolean(state.animationPreviewEnabled);
  if (!ANIMATION_PRESETS.some((preset) => preset.id === state.animationPreset)) {
    state.animationPreset = DEFAULT_STATE.animationPreset;
  }

  if (!PATTERNS.some((pattern) => pattern.id === state.pattern)) state.pattern = DEFAULT_STATE.pattern;
  if (!PATTERNS.some((pattern) => pattern.id === state.overlayPattern)) state.overlayPattern = DEFAULT_STATE.overlayPattern;
  if (!BACKGROUND_PRESETS.some((preset) => preset.id === state.backgroundPreset)) {
    state.backgroundPreset = DEFAULT_STATE.backgroundPreset;
  }
  if (!ASPECT_RATIOS.some((ratio) => ratio.id === state.aspectRatio)) state.aspectRatio = DEFAULT_STATE.aspectRatio;

  return state;
}

function clampNumber(value, min, max) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

function wrapDegrees(value) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 0;
  return ((numeric % 360) + 360) % 360;
}
