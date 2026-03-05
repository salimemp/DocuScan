import { useColorScheme } from 'react-native';

const lightColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceHighlight: '#F1F5F9',
  primary: '#2563EB',
  primaryForeground: '#FFFFFF',
  secondary: '#E2E8F0',
  secondaryForeground: '#1E293B',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  error: '#EF4444',
  success: '#10B981',
};

const darkColors = {
  background: '#020617',
  surface: '#1E293B',
  surfaceHighlight: '#334155',
  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',
  secondary: '#334155',
  secondaryForeground: '#F8FAFC',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  border: '#334155',
  error: '#F87171',
  success: '#34D399',
};

const lightShadows = {
  sm: { shadowColor: '#64748B', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  md: { shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#2563EB', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
};

const darkShadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
};

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  return {
    colors: isDark ? darkColors : lightColors,
    shadows: isDark ? darkShadows : lightShadows,
    isDark,
  };
};
