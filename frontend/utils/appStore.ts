import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'docscanpro-app-storage';

interface AppState {
  // Onboarding
  hasCompletedOnboarding: boolean;
  setOnboardingComplete: (complete: boolean) => void;
  
  // App initialization
  isAppReady: boolean;
  setAppReady: (ready: boolean) => void;
  
  // User preferences
  lastOpenedDocumentId: string | null;
  setLastOpenedDocument: (id: string | null) => void;
  
  // Load state from storage
  loadFromStorage: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Onboarding state
  hasCompletedOnboarding: false,
  setOnboardingComplete: async (complete) => {
    set({ hasCompletedOnboarding: complete });
    // Persist to storage
    try {
      const state = { hasCompletedOnboarding: complete, lastOpenedDocumentId: get().lastOpenedDocumentId };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.log('Error saving to storage:', e);
    }
  },
  
  // App readiness
  isAppReady: false,
  setAppReady: (ready) => set({ isAppReady: ready }),
  
  // User preferences
  lastOpenedDocumentId: null,
  setLastOpenedDocument: async (id) => {
    set({ lastOpenedDocumentId: id });
    // Persist to storage
    try {
      const state = { hasCompletedOnboarding: get().hasCompletedOnboarding, lastOpenedDocumentId: id };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.log('Error saving to storage:', e);
    }
  },
  
  // Load state from storage
  loadFromStorage: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        set({
          hasCompletedOnboarding: data.hasCompletedOnboarding ?? false,
          lastOpenedDocumentId: data.lastOpenedDocumentId ?? null,
        });
      }
    } catch (e) {
      console.log('Error loading from storage:', e);
    }
  },
}));
