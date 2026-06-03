import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

/**
 * Breakpoint system for responsive layouts.
 * - mobile:  < 768px  (phones, narrow web)
 * - tablet:  768-1023px (iPad portrait, small laptop window)
 * - desktop: ≥ 1024px (laptops, monitors)
 *
 * Use `isDesktop` / `isTablet` / `isMobile` for cleaner conditionals.
 * Use `cols(mobile, tablet, desktop)` helper to pick a value per breakpoint.
 */

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

const getBreakpoint = (width: number): Breakpoint => {
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
};

export function useBreakpoint() {
  const [size, setSize] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setSize(window));
    return () => sub.remove();
  }, []);

  const bp = getBreakpoint(size.width);
  return {
    width: size.width,
    height: size.height,
    breakpoint: bp,
    isMobile: bp === 'mobile',
    isTablet: bp === 'tablet',
    isDesktop: bp === 'desktop',
    isAtLeastTablet: bp !== 'mobile',
    isWide: size.width >= BREAKPOINTS.wide,
    /**
     * Pick a value based on current breakpoint.
     * `pick(mobile, tablet?, desktop?)` — desktop falls back to tablet, tablet to mobile.
     */
    pick: <T,>(mobile: T, tablet?: T, desktop?: T): T => {
      if (bp === 'desktop') return desktop ?? tablet ?? mobile;
      if (bp === 'tablet') return tablet ?? mobile;
      return mobile;
    },
  };
}
