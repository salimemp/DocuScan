import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Text } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n/i18n';
import { QueryProvider } from '../utils/queryClient';
import { analytics } from '../utils/analytics';
import { useAppStore } from '../utils/appStore';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  
  // Use Zustand store for persistent state
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const setAppReady = useAppStore((state) => state.setAppReady);
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Wait for Zustand to hydrate from AsyncStorage
  useEffect(() => {
    const checkHydration = async () => {
      // Check if store is already hydrated
      if (useAppStore.persist.hasHydrated()) {
        setIsHydrated(true);
        await analytics.init();
        setAppReady(true);
        SplashScreen.hideAsync();
        return;
      }
      
      // Wait for hydration
      const unsubscribe = useAppStore.persist.onFinishHydration(async () => {
        setIsHydrated(true);
        await analytics.init();
        setAppReady(true);
        SplashScreen.hideAsync();
      });

      return () => unsubscribe();
    };

    checkHydration();
  }, [setAppReady]);

  // Handle navigation based on onboarding status - only once after hydration
  useEffect(() => {
    if (!isHydrated || hasNavigated) return;
    
    const currentSegment = segments[0];
    const isOnOnboarding = currentSegment === 'onboarding';
    const isOnTabs = currentSegment === '(tabs)';
    const isOnIndex = currentSegment === undefined || currentSegment === 'index';
    
    // If user hasn't completed onboarding and is not already there, redirect
    if (!hasCompletedOnboarding && !isOnOnboarding) {
      setHasNavigated(true);
      router.replace('/onboarding');
    } 
    // If user has completed onboarding and is on index/root, go to dashboard
    else if (hasCompletedOnboarding && isOnIndex) {
      setHasNavigated(true);
      router.replace('/(tabs)/dashboard');
    }
  }, [isHydrated, hasCompletedOnboarding, segments, router, hasNavigated]);

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 16, color: '#64748B', fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="auth"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="subscription"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="profile"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="notifications"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="scan"
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="preview"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="document/[id]"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="editor"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="compliance"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="templates"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <I18nextProvider i18n={i18n}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <RootLayoutNav />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </I18nextProvider>
    </QueryProvider>
  );
}
