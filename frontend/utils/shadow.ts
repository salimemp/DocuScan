import { Platform, ViewStyle, TextStyle } from 'react-native';

/**
 * Cross-platform shadow helpers.
 *
 * React Native Web deprecates the individual `shadowColor` / `shadowOffset` /
 * `shadowOpacity` / `shadowRadius` style props and the `textShadow*` props in
 * favour of combined `boxShadow` / `textShadow` strings. The individual props
 * still work on iOS/Android, but produce console warnings on web.
 *
 * These helpers return a style object that uses the individual props on
 * native (preserving look) and the combined string on web (silencing the
 * warning). Use them instead of hand-rolling `Platform.select` everywhere.
 */

/**
 * Drop-shadow style helper. Pass the same values you'd pass to the iOS
 * individual props; they're mapped to `boxShadow` on web and to the
 * individual props on iOS. Android falls back to `elevation`.
 *
 *   shadow({ offsetY: 4, blur: 12, opacity: 0.15, color: '#2563EB', elevation: 8 })
 */
export function shadow(opts: {
  offsetX?: number;
  offsetY?: number;
  blur: number;
  opacity: number;
  color?: string;
  elevation?: number;  // Android only
}): ViewStyle {
  const {
    offsetX = 0,
    offsetY = 0,
    blur,
    opacity,
    color = '#000',
    elevation = 4,
  } = opts;

  const boxShadow = `${offsetX}px ${offsetY}px ${blur}px ${color}${alphaToHex(opacity)}`;

  if (Platform.OS === 'web') {
    return { boxShadow } as ViewStyle;
  }

  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation,
  } as ViewStyle;
}

/**
 * Text-shadow style helper. Same idea as `shadow()` but for `textShadow`.
 */
export function textShadow(opts: {
  offsetX?: number;
  offsetY?: number;
  blur: number;
  color: string;
  opacity?: number;
}): TextStyle {
  const { offsetX = 0, offsetY = 0, blur, color, opacity = 1 } = opts;

  const cssTextShadow = `${offsetX}px ${offsetY}px ${blur}px ${color}${alphaToHex(opacity)}`;

  if (Platform.OS === 'web') {
    return { textShadow: cssTextShadow } as TextStyle;
  }

  return {
    textShadowColor: color,
    textShadowOffset: { width: offsetX, height: offsetY },
    textShadowRadius: blur,
  } as TextStyle;
}

function alphaToHex(alpha: number): string {
  if (alpha >= 1) return '';
  const hex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return hex;
}