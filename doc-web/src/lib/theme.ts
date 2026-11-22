export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'moonset-theme';

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemPrefersDark ? 'dark' : 'light';
}

/**
 * Toggles theme with immediate visible feedback on first click while preserving
 * system-sync as the natural return state.
 *
 * Example when system is dark:
 *   system (dark) -> light -> system (dark)
 * Example when system is light:
 *   system (light) -> dark -> system (light)
 */
export function nextThemePreference(
  current: ThemePreference,
  systemPrefersDark: boolean,
): ThemePreference {
  if (current === 'system') {
    return systemPrefersDark ? 'light' : 'dark';
  }
  const oppositeOfSystem: ThemePreference = systemPrefersDark ? 'light' : 'dark';
  if (current === oppositeOfSystem) {
    return 'system';
  }
  return oppositeOfSystem;
}

export function parseStoredTheme(raw: string | null | undefined): ThemePreference {
  if (raw === 'light' || raw === 'dark' || raw === 'system') {
    return raw;
  }
  return 'system';
}
