import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeColorKey, ThemePalettes } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { getSettings } from '../services/settings';

type ThemePreference = 'light' | 'dark' | 'system';
type Palette = Record<ThemeColorKey, string>;

type ThemeContextValue = {
  colors: Palette;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  // Load the user's saved preference once, on app start.
  useEffect(() => {
    getSettings().then((settings) => {
      if (settings?.theme) setPreference(settings.theme);
    });
  }, []);

  const resolvedScheme: 'light' | 'dark' =
    preference === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : preference;

  const colors = ThemePalettes[resolvedScheme];

  // Only create a new context value when something actually changed —
  // otherwise every unrelated re-render of ThemeProvider forces the entire
  // app tree to re-render and repaint at once.
  const value = useMemo(
    () => ({ colors, preference, setPreference }),
    [colors, preference]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Full context access — used by Settings to read/change the preference itself.
export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used inside a ThemeProvider');
  }
  return ctx;
}

// Sugar for the common case — most screens only need the resolved colors.
export function useTheme() {
  return useThemeContext().colors;
}