import React from 'react';
import { View, ViewStyle, StyleSheet, StyleProp } from 'react-native';
import { useBreakpoint, BREAKPOINTS } from '../hooks/useBreakpoint';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  /**
   * Max width on desktop. Defaults to 1200.
   * Use 'wide' (1440), 'narrow' (640), or any number.
   */
  maxWidth?: number | 'narrow' | 'reading' | 'standard' | 'wide';
  /**
   * Horizontal padding on desktop (defaults to 32).
   */
  desktopPadding?: number;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  /**
   * If true, the container fills 100% height (good for sticky-footer layouts).
   */
  fullHeight?: boolean;
}

const MAX_WIDTH_MAP: Record<string, number> = {
  narrow: 640,
  reading: 800,
  standard: 1200,
  wide: BREAKPOINTS.wide,
};

/**
 * Centers content with a max-width on desktop/tablet, edge-to-edge on mobile.
 * Use this as the topmost wrapper inside ScrollView contentContainerStyle
 * (or wrap a screen body directly).
 */
export function ResponsiveContainer({
  children,
  maxWidth = 'standard',
  desktopPadding = 32,
  style,
  innerStyle,
  fullHeight,
}: ResponsiveContainerProps) {
  const { isAtLeastTablet, isDesktop } = useBreakpoint();
  const resolvedMax =
    typeof maxWidth === 'number' ? maxWidth : MAX_WIDTH_MAP[maxWidth] ?? 1200;

  if (!isAtLeastTablet) {
    return <View style={[fullHeight && styles.fullHeight, style]}>{children}</View>;
  }

  return (
    <View
      style={[
        styles.outer,
        isDesktop && { paddingHorizontal: desktopPadding },
        fullHeight && styles.fullHeight,
        style,
      ]}
    >
      <View style={[styles.inner, { maxWidth: resolvedMax }, innerStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
  },
  inner: {
    width: '100%',
  },
  fullHeight: {
    flex: 1,
  },
});
