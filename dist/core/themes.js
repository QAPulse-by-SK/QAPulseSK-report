"use strict";
// QAPulseSK-report — theme registry
// Themes are exposed as CSS custom properties. The generator injects the
// resolved block into <style>:root { ... }. User overrides in ThemeConfig
// win over the preset.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_THEME = void 0;
exports.listThemes = listThemes;
exports.resolveTheme = resolveTheme;
exports.renderThemeCss = renderThemeCss;
const THEMES = {
    'qapulse-dark': {
        bg: '#0d0f12',
        card: '#111418',
        blue: '#3b82f6',
        blueDim: '#1d3a6e',
        text: '#e8edf5',
        muted: '#8b95a3',
        green: '#22c55e',
        amber: '#f59e0b',
        red: '#ef4444',
        purple: '#a78bfa',
        border: 'rgba(255,255,255,0.07)',
    },
    'qapulse-light': {
        bg: '#fbf9f4',
        card: '#ffffff',
        blue: '#2563eb',
        blueDim: '#dbeafe',
        text: '#1a1f2e',
        muted: '#6b7280',
        green: '#15803d',
        amber: '#c2410c',
        red: '#b91c1c',
        purple: '#6d28d9',
        border: 'rgba(26,31,46,0.1)',
    },
    'github-dark': {
        bg: '#0d1117',
        card: '#161b22',
        blue: '#58a6ff',
        blueDim: '#1f6feb',
        text: '#c9d1d9',
        muted: '#8b949e',
        green: '#3fb950',
        amber: '#d29922',
        red: '#f85149',
        purple: '#bc8cff',
        border: 'rgba(240,246,252,0.1)',
    },
    'github-light': {
        bg: '#ffffff',
        card: '#f6f8fa',
        blue: '#0969da',
        blueDim: '#ddf4ff',
        text: '#1f2328',
        muted: '#656d76',
        green: '#1a7f37',
        amber: '#9a6700',
        red: '#cf222e',
        purple: '#8250df',
        border: 'rgba(31,35,40,0.15)',
    },
    'dracula': {
        bg: '#282a36',
        card: '#343746',
        blue: '#8be9fd',
        blueDim: '#44475a',
        text: '#f8f8f2',
        muted: '#6272a4',
        green: '#50fa7b',
        amber: '#f1fa8c',
        red: '#ff5555',
        purple: '#bd93f9',
        border: 'rgba(248,248,242,0.08)',
    },
    'solarized-light': {
        bg: '#fdf6e3',
        card: '#eee8d5',
        blue: '#268bd2',
        blueDim: '#93a1a1',
        text: '#073642',
        muted: '#657b83',
        green: '#859900',
        amber: '#b58900',
        red: '#dc322e',
        purple: '#6c71c4',
        border: 'rgba(7,54,66,0.1)',
    },
    'minimal': {
        bg: '#ffffff',
        card: '#fafafa',
        blue: '#000000',
        blueDim: '#e5e5e5',
        text: '#111111',
        muted: '#777777',
        green: '#111111',
        amber: '#111111',
        red: '#111111',
        purple: '#111111',
        border: 'rgba(0,0,0,0.08)',
    },
};
exports.DEFAULT_THEME = 'qapulse-dark';
function listThemes() {
    return Object.keys(THEMES);
}
function resolveTheme(config) {
    const name = config?.name || exports.DEFAULT_THEME;
    const base = THEMES[name] || THEMES[exports.DEFAULT_THEME];
    // Apply legacy user overrides (v1.x kept these).
    return {
        ...base,
        ...(config?.backgroundColor ? { bg: config.backgroundColor } : {}),
        ...(config?.cardColor ? { card: config.cardColor } : {}),
        ...(config?.primaryColor ? { blue: config.primaryColor } : {}),
    };
}
/** Emit the :root CSS custom-property block for a resolved theme. */
function renderThemeCss(vars) {
    return `
  :root {
    --bg: ${vars.bg};
    --card: ${vars.card};
    --blue: ${vars.blue};
    --blue-dim: ${vars.blueDim};
    --text: ${vars.text};
    --muted: ${vars.muted};
    --green: ${vars.green};
    --amber: ${vars.amber};
    --red: ${vars.red};
    --purple: ${vars.purple};
    --border: ${vars.border};
    --radius: 10px;
    --font: 'Inter', system-ui, sans-serif;
    --mono: 'JetBrains Mono', 'Fira Code', monospace;
  }`.trim();
}
//# sourceMappingURL=themes.js.map