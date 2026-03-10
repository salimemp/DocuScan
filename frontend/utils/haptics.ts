/**
 * Haptic Feedback Utility for DocScan Pro
 * Provides tactile feedback for user interactions
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Check if haptics are supported
const isHapticsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Light haptic feedback - for subtle interactions
 * Use for: button highlights, hover states
 */
export const lightHaptic = async () => {
  if (!isHapticsSupported) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {
    console.log('Haptic feedback not available');
  }
};

/**
 * Medium haptic feedback - for standard interactions
 * Use for: button presses, selections, toggles
 */
export const mediumHaptic = async () => {
  if (!isHapticsSupported) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {
    console.log('Haptic feedback not available');
  }
};

/**
 * Heavy haptic feedback - for important actions
 * Use for: confirmations, completing actions, shutter press
 */
export const heavyHaptic = async () => {
  if (!isHapticsSupported) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (e) {
    console.log('Haptic feedback not available');
  }
};

/**
 * Success haptic feedback - for successful operations
 * Use for: successful scans, saved documents, completed exports
 */
export const successHaptic = async () => {
  if (!isHapticsSupported) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {
    console.log('Haptic feedback not available');
  }
};

/**
 * Warning haptic feedback - for warnings
 * Use for: validation errors, warnings, attention needed
 */
export const warningHaptic = async () => {
  if (!isHapticsSupported) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (e) {
    console.log('Haptic feedback not available');
  }
};

/**
 * Error haptic feedback - for errors
 * Use for: failed operations, invalid input, critical errors
 */
export const errorHaptic = async () => {
  if (!isHapticsSupported) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (e) {
    console.log('Haptic feedback not available');
  }
};

/**
 * Selection haptic feedback - for selection changes
 * Use for: picker changes, tab switches, option selections
 */
export const selectionHaptic = async () => {
  if (!isHapticsSupported) return;
  try {
    await Haptics.selectionAsync();
  } catch (e) {
    console.log('Haptic feedback not available');
  }
};

/**
 * Camera shutter haptic - special pattern for photo capture
 */
export const shutterHaptic = async () => {
  if (!isHapticsSupported) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Small delay then light tap
    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 100);
  } catch (e) {
    console.log('Haptic feedback not available');
  }
};

/**
 * Batch complete haptic - pattern for batch scanning complete
 */
export const batchCompleteHaptic = async () => {
  if (!isHapticsSupported) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 150);
    setTimeout(async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 300);
  } catch (e) {
    console.log('Haptic feedback not available');
  }
};

/**
 * Vibration pattern haptic - custom pattern
 */
export const patternHaptic = async (pattern: ('light' | 'medium' | 'heavy')[]) => {
  if (!isHapticsSupported) return;
  
  for (let i = 0; i < pattern.length; i++) {
    setTimeout(async () => {
      try {
        switch (pattern[i]) {
          case 'light':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
        }
      } catch (e) {
        // Ignore
      }
    }, i * 100);
  }
};

export default {
  light: lightHaptic,
  medium: mediumHaptic,
  heavy: heavyHaptic,
  success: successHaptic,
  warning: warningHaptic,
  error: errorHaptic,
  selection: selectionHaptic,
  shutter: shutterHaptic,
  batchComplete: batchCompleteHaptic,
  pattern: patternHaptic,
};
