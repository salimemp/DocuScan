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
