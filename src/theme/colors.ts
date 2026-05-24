import { useColorScheme } from 'react-native';

import { useAppStore } from '@/src/store/app-store';
import { ThemePreference } from '@/src/types/habits';

export type ThemeTokens = {
  mode: Exclude<ThemePreference, 'system'>;
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primarySoft: string;
  success: string;
  warning: string;
  danger: string;
  teal: string;
  purple: string;
  tabBar: string;
  statusBar: 'light' | 'dark';
};

export const themes: Record<Exclude<ThemePreference, 'system'>, ThemeTokens> = {
  light: {
    mode: 'light',
    background: '#f4f7fb',
    surface: '#ffffff',
    surfaceMuted: '#e8eef8',
    text: '#10243e',
    textMuted: '#5c6b82',
    border: '#d8e0ec',
    primary: '#2563eb',
    primarySoft: '#dbeafe',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#ef4444',
    teal: '#14b8a6',
    purple: '#7c3aed',
    tabBar: '#ffffff',
    statusBar: 'dark',
  },
  dark: {
    mode: 'dark',
    background: '#07111f',
    surface: '#111d2f',
    surfaceMuted: '#1a2a42',
    text: '#edf5ff',
    textMuted: '#9fb2cc',
    border: '#263a56',
    primary: '#60a5fa',
    primarySoft: '#17365f',
    success: '#4ade80',
    warning: '#fbbf24',
    danger: '#f87171',
    teal: '#2dd4bf',
    purple: '#a78bfa',
    tabBar: '#0d1728',
    statusBar: 'light',
  },
  amoled: {
    mode: 'amoled',
    background: '#000000',
    surface: '#050505',
    surfaceMuted: '#101010',
    text: '#f7fbff',
    textMuted: '#b6c2d2',
    border: '#242424',
    primary: '#5eead4',
    primarySoft: '#062522',
    success: '#86efac',
    warning: '#facc15',
    danger: '#fb7185',
    teal: '#5eead4',
    purple: '#c4b5fd',
    tabBar: '#000000',
    statusBar: 'light',
  },
};

export const palette = themes.light;

export function resolveThemePreference(preference: ThemePreference, systemScheme: string | null | undefined) {
  if (preference === 'system') {
    return systemScheme === 'dark' ? themes.dark : themes.light;
  }

  return themes[preference];
}

export function useThemeTokens() {
  const preference = useAppStore((state) => state.preferences.theme);
  const systemScheme = useColorScheme();
  return resolveThemePreference(preference, systemScheme);
}
