/**
 * "Powered by Elixio Digital" attribution footer.
 *
 * Elixio Digital is the studio behind DocScan Pro. This component renders
 * the brand attribution that appears on the Dashboard tab. Used by:
 *   - frontend/app/(tabs)/dashboard.tsx  (mounted at the bottom of the screen)
 *
 * If you rebrand away from Elixio (or want to hide the attribution behind a
 * feature flag), do it here in one place — do not duplicate the strings in
 * each screen. See memory/BRAND.md for the current attribution policy.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface PoweredByProps {
  style?: object;
}

export const PoweredByElixio: React.FC<PoweredByProps> = ({ style }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, { color: colors.textTertiary }]}>
        Powered by{' '}
        <Text style={[styles.brand, { color: colors.primary }]}>Elixio Digital</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    zIndex: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
  },
  brand: {
    fontWeight: '700',
  },
});

export default PoweredByElixio;
