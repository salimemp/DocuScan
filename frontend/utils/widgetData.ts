/**
 * Widget Configuration for DocScan Pro
 * Provides home screen widget support for iOS and Android
 * 
 * Note: Full widget implementation requires native code and 
 * expo-widgets or react-native-shared-widget-data packages
 * This file provides the data layer for widget communication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const WIDGET_DATA_KEY = '@DocScanPro:widgetData';

export interface WidgetData {
  // Quick stats for widget display
  totalScans: number;
  lastScanDate: string | null;
  storageUsed: string;
  recentDocuments: {
    id: string;
    title: string;
    thumbnail: string | null;
    date: string;
  }[];
  // User preferences
  userName: string | null;
  subscriptionTier: string;
}

const defaultWidgetData: WidgetData = {
  totalScans: 0,
  lastScanDate: null,
  storageUsed: '0 KB',
  recentDocuments: [],
  userName: null,
  subscriptionTier: 'free',
};

/**
 * Update widget data - called after relevant actions
 * This data is shared with native widget extensions
 */
export const updateWidgetData = async (data: Partial<WidgetData>) => {
  try {
    const existingData = await getWidgetData();
    const newData = { ...existingData, ...data };
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(newData));
    
    // If using expo-updates or native bridge, trigger widget refresh here
    // SharedGroupPreferences.setItem(WIDGET_DATA_KEY, newData);
    
    return newData;
  } catch (e) {
    console.log('Error updating widget data:', e);
    return null;
  }
};

/**
 * Get current widget data
 */
export const getWidgetData = async (): Promise<WidgetData> => {
  try {
    const data = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (data) {
      return { ...defaultWidgetData, ...JSON.parse(data) };
    }
    return defaultWidgetData;
  } catch (e) {
    console.log('Error getting widget data:', e);
    return defaultWidgetData;
  }
};

/**
 * Add a recent document to widget display
 */
export const addRecentDocumentToWidget = async (doc: {
  id: string;
  title: string;
  thumbnail: string | null;
}) => {
  const data = await getWidgetData();
  const recentDocs = [
    { ...doc, date: new Date().toISOString() },
    ...data.recentDocuments.filter(d => d.id !== doc.id),
  ].slice(0, 5); // Keep only 5 most recent
  
  await updateWidgetData({ recentDocuments: recentDocs });
};

/**
 * Update scan count for widget
 */
export const incrementWidgetScanCount = async () => {
  const data = await getWidgetData();
  await updateWidgetData({
    totalScans: data.totalScans + 1,
    lastScanDate: new Date().toISOString(),
  });
};

/**
 * Widget types supported
 */
export const WIDGET_TYPES = {
  // Small widget - shows quick scan button and stats
  SMALL: {
    id: 'small',
    name: 'Quick Scan',
    description: 'One-tap scan access with recent stats',
    size: { width: 2, height: 2 },
    supportedOS: ['ios', 'android'],
  },
  
  // Medium widget - shows recent documents
  MEDIUM: {
    id: 'medium',
    name: 'Recent Documents',
    description: 'View and access your recent scans',
    size: { width: 4, height: 2 },
    supportedOS: ['ios', 'android'],
  },
  
  // Large widget - shows stats and recent documents
  LARGE: {
    id: 'large',
    name: 'Document Dashboard',
    description: 'Full dashboard with stats and documents',
    size: { width: 4, height: 4 },
    supportedOS: ['ios', 'android'],
  },
};

/**
 * Deep link handlers for widget actions
 */
export const WIDGET_ACTIONS = {
  QUICK_SCAN: 'docscanpro://scan',
  OPEN_DOCUMENT: (id: string) => `docscanpro://document/${id}`,
  OPEN_DASHBOARD: 'docscanpro://dashboard',
  OPEN_HISTORY: 'docscanpro://history',
};

export default {
  updateWidgetData,
  getWidgetData,
  addRecentDocumentToWidget,
  incrementWidgetScanCount,
  WIDGET_TYPES,
  WIDGET_ACTIONS,
};
