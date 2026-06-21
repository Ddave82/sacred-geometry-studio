import './styles.css';
import { ANIMATION_PRESETS } from './animation.js';
import {
  ASPECT_RATIOS,
  BACKGROUND_PRESETS,
  PATTERNS,
  createDefaultState,
  getAspectRatio,
  getPattern,
  patternUsesSymmetry,
  sanitizeState,
} from './state.js';
import { applyMoodPreset, createSeed, generateVariation, MOOD_PRESETS } from './presets.js';
import { exportGif, exportPng, exportSvg, exportVideo } from './export.js';
import { getPreviewAspect, renderArtworkSvg } from './renderer.js';
import { deletePreset, loadSavedPresets, savePreset } from './storage.js';

let state = createDefaultState();
let animationFrameId = null;
let previewAnimationTime = 0;
let previewStartedAt = 0;
let lastPreviewRenderAt = 0;

const PREVIEW_MAX_FPS = 24;

const elements = {
  mount: document.querySelector('#artworkMount'),
  frame: document.querySelector('#artworkFrame'),
  previewTitle: document.querySelector('#previewTitle'),
  previewAspect: document.querySelector('#previewAspect'),
  previewPattern: document.querySelector('#previewPattern'),
  patternDescription: document.querySelector('#patternDescription'),
  moodPresetGrid: document.querySelector('#moodPresetGrid'),
  seedInput: document.querySelector('#seedInput'),
  presetNameInput: document.querySelector('#presetNameInput'),
  savedPresetSelect: document.querySelector('#savedPresetSelect'),
  symmetryInput: document.querySelector('#symmetryInput'),
  symmetryField: document.querySelector('#symmetryInput')?.closest('.field'),
  overlaySymmetryInput: document.querySelector('#overlaySymmetryInput'),
  overlaySymmetryField: document.querySelector('#overlaySymmetryInput')?.closest('.field'),
  exportGifButton: document.querySelector('#exportGifButton'),
  exportWebmButton: document.querySelector('#exportWebmButton'),
  exportMp4Button: document.querySelector('#exportMp4Button'),
  videoExportStatus: document.querySelector('#videoExportStatus'),
};

const bindings = [...document.querySelectorAll('[data-bind]')];
const numericKeys = new Set([
  'complexity',
  'scale',
  'rotation',
  'symmetry',
  'strokeWidth',
  'strokeOpacity',
  'fillOpacity',
  'glowStrength',
  'overlayOpacity',
  'overlayScale',
  'overlayComplexity',
  'overlaySymmetry',
  'overlayRotation',
  'exportSize',
  'animationDuration',
  'animationFps',
  'animationStrength',
  'gifSize',
  'gifFps',
]);

const checkboxKeys = new Set([
  'fillEnabled',
  'centerEmphasis',
  'overlayEnabled',
  'centerSymbolEnabled',
  'vignette',
  'grain',
  'animationPreviewEnabled',
]);

const outputs = {
  complexity: document.querySelector('#complexityValue'),
  scale: document.querySelector('#scaleValue'),
  rotation: document.querySelector('#rotationValue'),
  symmetry: document.querySelector('#symmetryValue'),
  strokeWidth: document.querySelector('#strokeWidthValue'),
  strokeOpacity: document.querySelector('#strokeOpacityValue'),
  fillOpacity: document.querySelector('#fillOpacityValue'),
  glowStrength: document.querySelector('#glowStrengthValue'),
  overlayOpacity: document.querySelector('#overlayOpacityValue'),
  overlayScale: document.querySelector('#overlayScaleValue'),
  overlayComplexity: document.querySelector('#overlayComplexityValue'),
  overlaySymmetry: document.querySelector('#overlaySymmetryValue'),
  overlayRotation: document.querySelector('#overlayRotationValue'),
  animationDuration: document.querySelector('#animationDurationValue'),
  animationFps: document.querySelector('#animationFpsValue'),
  animationStrength: document.querySelector('#animationStrengthValue'),
  gifSize: document.querySelector('#gifSizeValue'),
  gifFps: document.querySelector('#gifFpsValue'),
};

init();

function init() {
  populateSelect(document.querySelector('#patternSelect'), PATTERNS);
  populateSelect(document.querySelector('#overlayPatternSelect'), PATTERNS);
  populateSelect(document.querySelector('#backgroundPresetSelect'), BACKGROUND_PRESETS);
  populateSelect(document.querySelector('#aspectRatioSelect'), ASPECT_RATIOS);
  populateSelect(document.querySelector('#animationPresetSelect'), ANIMATION_PRESETS);
  renderMoodPresetButtons();
  bindControlEvents();
  bindActionEvents();
  syncSavedPresetSelect();
  syncControls();
  render();
}

function populateSelect(select, items) {
  select.innerHTML = items.map((item) => `<option value="${item.id}">${item.label}</option>`).join('');
}

function renderMoodPresetButtons() {
  elements.moodPresetGrid.innerHTML = MOOD_PRESETS.map(
    (preset) => `<button class="preset-button" type="button" data-preset="${preset.id}">${preset.name}</button>`,
  ).join('');

  elements.moodPresetGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset]');
    if (!button) return;
    state = applyMoodPreset(state, button.dataset.preset);
    syncControls();
    render();
  });
}

function bindControlEvents() {
  bindings.forEach((control) => {
    const eventName = control.matches('input[type="range"], input[type="color"], input[type="number"]') ? 'input' : 'change';
    control.addEventListener(eventName, () => {
      const key = control.dataset.bind;
      let value = control.value;
      if (checkboxKeys.has(key)) value = control.checked;
      if (numericKeys.has(key)) value = Number(value);
      state = sanitizeState({
        ...state,
        [key]: value,
        moodPreset: 'custom',
      });
      syncOutputs();
      render();
    });
  });
}

function bindActionEvents() {
  document.querySelector('#randomizeButton').addEventListener('click', () => {
    state = generateVariation(createSeed());
    syncControls();
    render();
  });

  document.querySelector('#applySeedButton').addEventListener('click', () => {
    const seed = elements.seedInput.value.trim() || state.seed;
    state = generateVariation(seed);
    syncControls();
    render();
  });

  elements.seedInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    state = generateVariation(elements.seedInput.value.trim() || state.seed);
    syncControls();
    render();
  });

  document.querySelector('#resetButton').addEventListener('click', () => {
    state = createDefaultState();
    syncControls();
    render();
  });

  document.querySelector('#exportSvgButton').addEventListener('click', () => exportSvg(state));
  document.querySelector('#exportPngButton').addEventListener('click', () => exportPng(state));
  elements.exportGifButton.addEventListener('click', () => handleMotionExport('gif'));
  elements.exportWebmButton.addEventListener('click', () => handleMotionExport('webm'));
  elements.exportMp4Button.addEventListener('click', () => handleMotionExport('mp4'));

  document.querySelector('#savePresetButton').addEventListener('click', () => {
    const name = elements.presetNameInput.value.trim();
    if (!name) {
      elements.presetNameInput.focus();
      return;
    }
    savePreset(name, state);
    elements.presetNameInput.value = '';
    syncSavedPresetSelect();
  });

  document.querySelector('#loadPresetButton').addEventListener('click', () => {
    const preset = loadSavedPresets().find((item) => item.id === elements.savedPresetSelect.value);
    if (!preset) return;
    state = sanitizeState({ ...preset.state, moodPreset: 'custom' });
    syncControls();
    render();
  });

  document.querySelector('#deletePresetButton').addEventListener('click', () => {
    const id = elements.savedPresetSelect.value;
    if (!id) return;
    deletePreset(id);
    syncSavedPresetSelect();
  });
}

function syncControls() {
  bindings.forEach((control) => {
    const key = control.dataset.bind;
    if (checkboxKeys.has(key)) {
      control.checked = Boolean(state[key]);
    } else {
      control.value = state[key];
    }
  });
  elements.seedInput.value = state.seed;
  syncOutputs();
  syncControlAvailability();
  syncPresetButtons();
}

function syncOutputs() {
  outputs.complexity.textContent = state.complexity;
  outputs.scale.textContent = `${state.scale}%`;
  outputs.rotation.textContent = `${Math.round(state.rotation)}deg`;
  outputs.symmetry.textContent = state.symmetry;
  outputs.strokeWidth.textContent = state.strokeWidth.toFixed(1);
  outputs.strokeOpacity.textContent = `${Math.round(state.strokeOpacity * 100)}%`;
  outputs.fillOpacity.textContent = `${Math.round(state.fillOpacity * 100)}%`;
  outputs.glowStrength.textContent = state.glowStrength.toFixed(1);
  outputs.overlayOpacity.textContent = `${Math.round(state.overlayOpacity * 100)}%`;
  outputs.overlayScale.textContent = `${state.overlayScale}%`;
  outputs.overlayComplexity.textContent = state.overlayComplexity;
  outputs.overlaySymmetry.textContent = state.overlaySymmetry;
  outputs.overlayRotation.textContent = `${Math.round(state.overlayRotation)}deg`;
  outputs.animationDuration.textContent = `${state.animationDuration}s`;
  outputs.animationFps.textContent = state.animationFps;
  outputs.animationStrength.textContent = `${state.animationStrength}%`;
  outputs.gifSize.textContent = `${state.gifSize}px`;
  outputs.gifFps.textContent = state.gifFps;
}

function syncControlAvailability() {
  setSymmetryAvailability({
    enabled: patternUsesSymmetry(state.pattern),
    field: elements.symmetryField,
    input: elements.symmetryInput,
    output: outputs.symmetry,
  });
  setSymmetryAvailability({
    enabled: patternUsesSymmetry(state.overlayPattern),
    field: elements.overlaySymmetryField,
    input: elements.overlaySymmetryInput,
    output: outputs.overlaySymmetry,
  });
}

function setSymmetryAvailability({ enabled, field, input, output }) {
  if (!field || !input || !output) return;
  input.disabled = !enabled;
  field.classList.toggle('is-disabled', !enabled);
  field.title = enabled ? '' : 'This pattern uses fixed symmetry.';
  if (!enabled) output.textContent = 'Fixed';
}

function syncPresetButtons() {
  document.querySelectorAll('[data-preset]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.preset === state.moodPreset);
  });
}

function syncSavedPresetSelect() {
  const presets = loadSavedPresets();
  elements.savedPresetSelect.innerHTML = presets.length
    ? presets.map((preset) => `<option value="${preset.id}">${preset.name}</option>`).join('')
    : '<option value="">No saved presets</option>';
}

function render() {
  const pattern = getPattern(state.pattern);
  const aspect = getAspectRatio(state.aspectRatio);
  const activePreset = MOOD_PRESETS.find((preset) => preset.id === state.moodPreset);

  renderPreviewFrame(state.animationPreviewEnabled ? previewAnimationTime : null);
  elements.frame.style.aspectRatio = getPreviewAspect(state);
  elements.previewTitle.textContent = activePreset?.name ?? 'Custom Design';
  elements.previewAspect.textContent = aspect.label;
  elements.previewPattern.textContent = pattern.label;
  elements.patternDescription.textContent = pattern.description;
  syncControlAvailability();
  syncAnimationLoop();
}

function renderPreviewFrame(animationTime = null) {
  const options = animationTime == null ? {} : { animationTime };
  elements.mount.innerHTML = renderArtworkSvg(state, options);
}

function syncAnimationLoop() {
  if (state.animationPreviewEnabled) {
    startAnimationLoop();
  } else {
    stopAnimationLoop();
  }
}

function startAnimationLoop() {
  if (animationFrameId !== null) return;
  previewStartedAt = performance.now() - previewAnimationTime * 1000;
  lastPreviewRenderAt = 0;

  const tick = (now) => {
    if (!state.animationPreviewEnabled) {
      animationFrameId = null;
      return;
    }

    const previewFps = Math.min(PREVIEW_MAX_FPS, Math.max(8, Number(state.animationFps) || PREVIEW_MAX_FPS));
    const frameInterval = 1000 / previewFps;

    if (!document.hidden && now - lastPreviewRenderAt >= frameInterval) {
      previewAnimationTime = (now - previewStartedAt) / 1000;
      renderPreviewFrame(previewAnimationTime);
      lastPreviewRenderAt = now;
    }

    animationFrameId = requestAnimationFrame(tick);
  };

  animationFrameId = requestAnimationFrame(tick);
}

function stopAnimationLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  previewAnimationTime = 0;
  lastPreviewRenderAt = 0;
}

async function handleMotionExport(format) {
  const activeButton = {
    gif: elements.exportGifButton,
    webm: elements.exportWebmButton,
    mp4: elements.exportMp4Button,
  }[format];
  const previousLabel = activeButton.textContent;
  setMotionExportBusy(true, activeButton);
  elements.videoExportStatus.textContent = `Preparing ${format.toUpperCase()}`;

  try {
    const result =
      format === 'gif'
        ? await exportGif(state, { onProgress: handleMotionExportProgress(activeButton, format) })
        : await exportVideo(state, {
            format,
            allowFallback: false,
            onProgress: handleMotionExportProgress(activeButton, format),
          });

    elements.videoExportStatus.textContent =
      result.extension === 'gif'
        ? `Saved GIF ${result.width}x${result.height}`
        : `Saved ${result.extension.toUpperCase()}`;
  } catch (error) {
    elements.videoExportStatus.textContent = error?.message || `${format.toUpperCase()} export failed`;
  } finally {
    activeButton.textContent = previousLabel;
    setMotionExportBusy(false, activeButton);
  }
}

function handleMotionExportProgress(button, format) {
  return ({ progress, fps, width, height }) => {
    const percent = Math.round(progress * 100);
    button.textContent = `${percent}%`;
    elements.videoExportStatus.textContent =
      format === 'gif' ? `Rendering GIF ${width}x${height} / ${fps}fps` : `Rendering ${format.toUpperCase()}`;
  };
}

function setMotionExportBusy(isBusy, activeButton) {
  [elements.exportGifButton, elements.exportWebmButton, elements.exportMp4Button].forEach((button) => {
    button.disabled = isBusy;
    button.classList.toggle('is-busy', isBusy && button === activeButton);
  });
}
