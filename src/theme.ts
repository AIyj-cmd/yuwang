// Theme registry for 工位鱼王. All 5 theme ids match [data-theme="..."]
// overrides declared in src/styles/themes.css. Persistence is plain
// localStorage under key STORAGE_KEY.
//
// Keep this module framework-agnostic so it can be imported from main.ts
// (to set the initial data-theme before Vue mounts) and from
// ThemeSwitcher.vue.

export type ThemeId = 'pond' | 'office' | 'night' | 'paper' | 'arcade';

export interface ThemeInfo {
  id: ThemeId;
  /** Display name in zh-CN. */
  labelZh: string;
  /** Display name in en-US. */
  labelEn: string;
  /** Short one-line description in zh-CN. */
  descriptionZh: string;
  /** Short one-line description in en-US. */
  descriptionEn: string;
  /**
   * Small color chips used in the switcher preview.
   * Order matters: [surface, primary, accent, border]. These literals are
   * only for rendering the mini preview swatch, not for component colors.
   */
  swatches: [string, string, string, string];
}

export const STORAGE_KEY = 'yuwang-theme';
export const DEFAULT_THEME: ThemeId = 'pond';

export const THEMES: ThemeInfo[] = [
  {
    id: 'pond',
    labelZh: '鱼塘默认',
    labelEn: 'Pond Default',
    descriptionZh: '黄色加薄荷绿，工位鱼王的品牌底色。',
    descriptionEn: 'Default yellow plus mint, the Yuwang brand look.',
    swatches: ['#fffefc', '#ffe66d', '#d8fff4', '#18202a']
  },
  {
    id: 'office',
    labelZh: '清爽办公',
    labelEn: 'Clean Office',
    descriptionZh: '浅蓝主色，适合长时间使用。',
    descriptionEn: 'Calm blue surface for long sessions.',
    swatches: ['#ffffff', '#5fa8e9', '#cef0e4', '#2b3a55']
  },
  {
    id: 'night',
    labelZh: '夜间摸鱼',
    labelEn: 'Night Shift',
    descriptionZh: '深蓝黑底，夜里不刺眼。',
    descriptionEn: 'Deep navy for after-hours.',
    swatches: ['#1c2540', '#f3d463', '#2d6d5f', '#c4cde0']
  },
  {
    id: 'paper',
    labelZh: '便签纸',
    labelEn: 'Paper Note',
    descriptionZh: '米白纸感，适合看长内容。',
    descriptionEn: 'Warm paper for reading long content.',
    swatches: ['#fbf6e7', '#f6d261', '#c4e4b2', '#4a3a20']
  },
  {
    id: 'arcade',
    labelZh: '街机高对比',
    labelEn: 'Arcade High Contrast',
    descriptionZh: '深紫黑底加亮黄青，游戏机感。',
    descriptionEn: 'Dark violet plus bright yellow and cyan.',
    swatches: ['#1e1830', '#ffe34d', '#3ce0c9', '#f5f2ff']
  }
];

const THEME_IDS: ThemeId[] = THEMES.map((theme) => theme.id);

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as string[]).includes(value);
}

/**
 * Read the saved theme id from localStorage. Returns DEFAULT_THEME if the
 * value is missing, invalid, or storage is unavailable (SSR / disabled).
 */
export function readSavedTheme(): ThemeId {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (isThemeId(raw)) return raw;
  } catch {
    /* ignore: localStorage might be blocked */
  }
  return DEFAULT_THEME;
}

/**
 * Apply the theme to <html data-theme="..."> and persist the selection.
 * Safe to call before Vue mounts.
 */
export function applyTheme(theme: ThemeId): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}
