/**
 * Widget Bridge - React Native side
 * 
 * Provides methods to update home screen widget data from the React Native app.
 * Uses SharedPreferences (Android) and App Groups UserDefaults (iOS) for data sharing.
 * 
 * Note: When running in Expo Go, widget updates are no-ops.
 * Widget data updates only work in production builds (eas build).
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WIDGET_DATA_KEY = 'DocScanPro_WidgetData';

export interface WidgetDocumentData {
  id: string;
  title: string;
  thumbnail?: string;
  date: string;
}

export interface WidgetData {
  totalScans: number;
  lastScanDate: string | null;
  storageUsed: string;
  recentDocuments: WidgetDocumentData[];
  userName: string | null;
  subscriptionTier: string;
}

/**
 * Save widget data to shared storage.
 * In production builds, this data is read by the native widget extensions.
 * In Expo Go / web, this stores to AsyncStorage as a fallback.
 */
export async function updateWidgetData(data: WidgetData): Promise<void> {
  try {
    const jsonString = JSON.stringify(data);
    
    // Store in AsyncStorage for the RN side
    await AsyncStorage.setItem(WIDGET_DATA_KEY, jsonString);
    
    // In production builds, use native module to update widgets
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        // Try to use the native module if available (production build)
        const { NativeModules } = require('react-native');
        if (NativeModules.WidgetBridge) {
          NativeModules.WidgetBridge.updateWidgetData(jsonString);
        }
      } catch {
        // Native module not available (Expo Go) - widget data saved to AsyncStorage
      }
    }
  } catch (error: unknown) {
    console.warn('[WidgetBridge] Failed to update widget data:', error);
  }
}

/**
 * Get the current widget data from shared storage.
 */
export async function getWidgetData(): Promise<WidgetData | null> {
  try {
    const jsonString = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (!jsonString) return null;
    return JSON.parse(jsonString) as WidgetData;
  } catch {
    return null;
  }
}

/**
 * Clear widget data (used on logout).
 */
export async function clearWidgetData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WIDGET_DATA_KEY);
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        const { NativeModules } = require('react-native');
        if (NativeModules.WidgetBridge) {
          NativeModules.WidgetBridge.clearWidgetData();
        }
      } catch {
        // Native module not available
      }
    }
  } catch (error: unknown) {
    console.warn('[WidgetBridge] Failed to clear widget data:', error);
  }
}

/**
 * Request widget timeline reload (forces widgets to refresh).
 */
export async function reloadWidgets(): Promise<void> {
  try {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const { NativeModules } = require('react-native');
      if (NativeModules.WidgetBridge) {
        NativeModules.WidgetBridge.reloadWidgets();
      }
    }
  } catch {
    // Native module not available
  }
}
