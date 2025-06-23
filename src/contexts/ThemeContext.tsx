import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { Theme, ThemeMode } from '../types';
import { getTheme } from '../utils/theme';
import { database } from '../utils/database';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeMode;
}

export function ThemeProvider({ children, initialTheme = 'system' }: ThemeProviderProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialTheme);
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Load theme from database on app start
  useEffect(() => {
    try {
      const dbPreferences = database.getUserPreferences();
      setThemeMode(dbPreferences.theme);
    } catch (error) {
      // Fallback to initial theme
    }
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  // Determine the actual theme to use
  const currentTheme = React.useMemo(() => {
    if (themeMode === 'system') {
      return getTheme(systemColorScheme === 'dark' ? 'dark' : 'light');
    }
    return getTheme(themeMode);
  }, [themeMode, systemColorScheme]);

  const isDark = currentTheme.mode === 'dark';

  const value: ThemeContextType = {
    theme: currentTheme,
    themeMode,
    setThemeMode,
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 