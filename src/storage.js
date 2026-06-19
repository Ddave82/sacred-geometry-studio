const STORAGE_KEY = 'sacred-geometry-studio.presets.v1';

export function loadSavedPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePreset(name, state) {
  const presets = loadSavedPresets();
  const trimmedName = name.trim();
  const preset = {
    id: createId(trimmedName),
    name: trimmedName,
    createdAt: new Date().toISOString(),
    state,
  };
  const next = [preset, ...presets.filter((item) => item.name !== trimmedName)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 40)));
  return preset;
}

export function deletePreset(id) {
  const presets = loadSavedPresets().filter((preset) => preset.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function createId(name) {
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${safeName || 'preset'}-${Date.now().toString(36)}`;
}
