import { ThemeConfig } from './types';
export type ThemeName = 'qapulse-dark' | 'qapulse-light' | 'github-dark' | 'github-light' | 'dracula' | 'solarized-light' | 'minimal';
export interface ThemeVars {
    bg: string;
    card: string;
    blue: string;
    blueDim: string;
    text: string;
    muted: string;
    green: string;
    amber: string;
    red: string;
    purple: string;
    border: string;
}
export declare const DEFAULT_THEME: ThemeName;
export declare function listThemes(): ThemeName[];
export declare function resolveTheme(config?: ThemeConfig): ThemeVars;
/** Emit the :root CSS custom-property block for a resolved theme. */
export declare function renderThemeCss(vars: ThemeVars): string;
//# sourceMappingURL=themes.d.ts.map