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
    }),
    {
      name: 'docscanpro-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        lastOpenedDocumentId: state.lastOpenedDocumentId,
      }),
    }
  )
);

// Direct check for hydration status
export const waitForHydration = (): Promise<void> => {
  return new Promise((resolve) => {
    // Check if already hydrated
    if (useAppStore.persist?.hasHydrated?.()) {
      resolve();
      return;
    }
    
    // Try to subscribe to hydration finish
    const unsubscribe = useAppStore.persist?.onFinishHydration?.(() => {
      unsubscribe?.();
      resolve();
    });
    
    // Fallback timeout in case hydration doesn't trigger
    setTimeout(() => {
      unsubscribe?.();
      resolve();
    }, 2000);
  });
};
