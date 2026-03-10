import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  
  // Hydration tracking
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Onboarding state
      hasCompletedOnboarding: false,
      setOnboardingComplete: (complete) => set({ hasCompletedOnboarding: complete }),
      
      // App readiness
      isAppReady: false,
      setAppReady: (ready) => set({ isAppReady: ready }),
      
      // User preferences
      lastOpenedDocumentId: null,
      setLastOpenedDocument: (id) => set({ lastOpenedDocumentId: id }),
      
      // Hydration tracking
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'docscanpro-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        lastOpenedDocumentId: state.lastOpenedDocumentId,
      }),
      onRehydrateStorage: () => (state) => {
        // This is called when rehydration finishes
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
