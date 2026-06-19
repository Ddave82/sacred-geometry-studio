import { getAspectRatio, getBackgroundPreset } from './state.js';
import { renderCenterSymbol, renderPattern } from './geometry/patterns.js';

export function renderArtworkSvg(state, options = {}) {
  const aspect = getAspectRatio(state.aspectRatio);
  const exportWidth = options.width ?? aspect.width;
  const exportHeight = options.height ?? aspect.height;
  const idPrefix = options.idPrefix ?? `sg-${hashString(state.seed)}`;
  const context = {
    width: exportWidth,
    height: exportHeight,
    cx: exportWidth / 2,
    cy: exportHeight / 2,
    maxRadius: Math.min(exportWidth, exportHeight) * 0.47,
  };
  const glowId = `${idPrefix}-glow`;
  const grainId = `${idPrefix}-grain`;
  const backgroundId = `${idPrefix}-background`;
  const vignetteId = `${idPrefix}-vignette`;
  const marbleId = `${idPrefix}-marble`;
  const defs = [
    renderGlowDef(glowId, state.glowStrength, state.strokeColor),
    renderGrainDef(grainId, state.seed),
    renderBackgroundDefs(backgroundId, vignetteId, marbleId, state),
  ].join('');

  const baseOptions = {
    complexity: state.complexity,
    scale: state.scale,
    rotation: state.rotation,
    strokeWidth: state.strokeWidth,
    strokeColor: state.strokeColor,
    secondaryColor: state.secondaryColor,
    fillEnabled: state.fillEnabled,
    fillOpacity: state.fillOpacity,
    strokeOpacity: state.strokeOpacity,
    glowStrength: state.glowStrength,
    glowId,
    centerEmphasis: state.centerEmphasis,
    symmetry: state.symmetry,
    opacity: 1,
  };
  const background = renderBackground(context, backgroundId, vignetteId, marbleId, grainId, state);
  const mainLayer = renderPattern(state.pattern, context, baseOptions);
  const overlayLayer = state.overlayEnabled
    ? renderPattern(state.overlayPattern, context, {
        ...baseOptions,
        complexity: state.overlayComplexity,
        scale: state.overlayScale,
        symmetry: state.overlaySymmetry,
        rotation: state.overlayRotation,
        strokeWidth: Math.max(0.8, state.strokeWidth * 0.72),
        strokeColor: state.secondaryColor,
        secondaryColor: state.strokeColor,
        fillEnabled: false,
        fillOpacity: 0,
        strokeOpacity: Math.min(1, state.strokeOpacity * 0.82),
        opacity: state.overlayOpacity,
        centerEmphasis: false,
      })
    : '';
  const centerLayer = state.centerSymbolEnabled
    ? renderCenterSymbol(context, {
        ...baseOptions,
        strokeWidth: Math.max(0.9, state.strokeWidth * 0.88),
        opacity: Math.min(1, state.strokeOpacity + 0.08),
      })
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}" viewBox="0 0 ${exportWidth} ${exportHeight}" role="img" aria-label="Sacred geometry artwork">
    <defs>${defs}</defs>
    ${background}
    <g stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke">
      ${overlayLayer}
      ${mainLayer}
      ${centerLayer}
    </g>
  </svg>`;
}

export function getExportDimensions(state) {
  const aspect = getAspectRatio(state.aspectRatio);
  const width = Number(state.exportSize);
  const height = Math.round((width * aspect.height) / aspect.width);
  return { width, height };
}

export function getPreviewAspect(state) {
  const aspect = getAspectRatio(state.aspectRatio);
  return `${aspect.width} / ${aspect.height}`;
}

function renderGlowDef(id, strength, color) {
  if (strength <= 0) return '';
  const blur = Math.max(0.2, strength * 0.72);
  return `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="${number(blur)}" result="blur" />
    <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.72 0" result="softGlow" />
    <feFlood flood-color="${color}" flood-opacity="0.28" result="glowColor" />
    <feComposite in="glowColor" in2="softGlow" operator="in" result="coloredGlow" />
    <feMerge>
      <feMergeNode in="coloredGlow" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>`;
}

function renderGrainDef(id, seed) {
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="${hashString(seed) % 97}" result="noise" />
    <feColorMatrix type="saturate" values="0" />
    <feComponentTransfer>
      <feFuncA type="table" tableValues="0 0.16" />
    </feComponentTransfer>
  </filter>`;
}

function renderBackgroundDefs(backgroundId, vignetteId, marbleId, state) {
  const preset = getBackgroundPreset(state.backgroundPreset);
  const color1 = state.backgroundColor1 || preset.colors[0];
  const color2 = state.backgroundColor2 || preset.colors[1];

  return `<linearGradient id="${backgroundId}-linear" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="${color1}" />
    <stop offset="100%" stop-color="${color2}" />
  </linearGradient>
  <radialGradient id="${backgroundId}-radial" cx="50%" cy="42%" r="72%">
    <stop offset="0%" stop-color="${color1}" />
    <stop offset="58%" stop-color="${mix(color1, color2, 0.32)}" />
    <stop offset="100%" stop-color="${color2}" />
  </radialGradient>
  <radialGradient id="${backgroundId}-cosmic-a" cx="30%" cy="18%" r="76%">
    <stop offset="0%" stop-color="${color1}" />
    <stop offset="44%" stop-color="${mix(color1, color2, 0.46)}" />
    <stop offset="100%" stop-color="${color2}" />
  </radialGradient>
  <radialGradient id="${backgroundId}-cosmic-b" cx="82%" cy="74%" r="68%">
    <stop offset="0%" stop-color="${mix(state.secondaryColor, color1, 0.68)}" stop-opacity="0.42" />
    <stop offset="100%" stop-color="${color2}" stop-opacity="0" />
  </radialGradient>
  <filter id="${marbleId}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.018 0.075" numOctaves="4" seed="${hashString(state.seed) % 137}" result="texture" />
    <feColorMatrix in="texture" type="matrix" values="0.55 0 0 0 0.45  0 0.55 0 0 0.43  0 0 0.55 0 0.38  0 0 0 0.2 0" />
  </filter>
  <radialGradient id="${vignetteId}" cx="50%" cy="50%" r="72%">
    <stop offset="60%" stop-color="#000000" stop-opacity="0" />
    <stop offset="100%" stop-color="#000000" stop-opacity="0.62" />
  </radialGradient>`;
}

function renderBackground(context, backgroundId, vignetteId, marbleId, grainId, state) {
  const preset = getBackgroundPreset(state.backgroundPreset);
  const rect = (attrs) => `<rect x="0" y="0" width="${context.width}" height="${context.height}" ${attrs} />`;
  const grain = state.grain
    ? rect(`fill="#ffffff" opacity="${preset.type === 'paper-light' || preset.type === 'marble' ? '0.2' : '0.16'}" filter="url(#${grainId})"`)
    : '';
  const vignette = state.vignette ? rect(`fill="url(#${vignetteId})"`) : '';

  if (preset.type === 'transparent') {
    return '';
  }

  if (preset.type === 'linear') {
    return `${rect(`fill="url(#${backgroundId}-linear)"`)}${grain}${vignette}`;
  }

  if (preset.type === 'radial') {
    return `${rect(`fill="url(#${backgroundId}-radial)"`)}${grain}${vignette}`;
  }

  if (preset.type === 'cosmic') {
    return `${rect(`fill="url(#${backgroundId}-cosmic-a)"`)}${rect(
      `fill="url(#${backgroundId}-cosmic-b)"`,
    )}${grain}${vignette}`;
  }

  if (preset.type === 'paper-dark') {
    return `${rect(`fill="url(#${backgroundId}-linear)"`)}${grain}${vignette}`;
  }

  if (preset.type === 'paper-light') {
    return `${rect(`fill="url(#${backgroundId}-linear)"`)}${grain}${vignette}`;
  }

  if (preset.type === 'marble') {
    return `${rect(`fill="url(#${backgroundId}-linear)"`)}${rect(
      `fill="#ffffff" opacity="0.34" filter="url(#${marbleId})"`,
    )}${grain}${vignette}`;
  }

  return `${rect(`fill="${state.backgroundColor1}"`)}${grain}${vignette}`;
}

function hashString(input) {
  const source = String(input || 'sacred-geometry');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (Math.imul(31, hash) + source.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function mix(colorA, colorB, weight) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const mixed = {
    r: Math.round(a.r + (b.r - a.r) * weight),
    g: Math.round(a.g + (b.g - a.g) * weight),
    b: Math.round(a.b + (b.b - a.b) * weight),
  };
  return rgbToHex(mixed);
}

function hexToRgb(color) {
  const hex = color.replace('#', '');
  const normalized = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function number(value) {
  return Number(value).toFixed(3).replace(/\.?0+$/, '');
}
