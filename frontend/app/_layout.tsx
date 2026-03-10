import React, { useEffect, useState } from 'react';
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
  
  // Use Zustand store for persistent state - subscribe to hydration state
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const hasHydrated = useAppStore((state) => state._hasHydrated);
  const setAppReady = useAppStore((state) => state.setAppReady);
  
  const [hasNavigated, setHasNavigated] = useState(false);
  const [initComplete, setInitComplete] = useState(false);

  // Initialize analytics and hide splash when hydrated
  useEffect(() => {
    if (hasHydrated && !initComplete) {
      const init = async () => {
        await analytics.init();
        setAppReady(true);
        SplashScreen.hideAsync();
        setInitComplete(true);
      };
      init();
    }
  }, [hasHydrated, initComplete, setAppReady]);

  // Handle navigation based on onboarding status - only once after hydration
  useEffect(() => {
    if (!hasHydrated || !initComplete || hasNavigated) return;
    
    const currentSegment = segments[0];
    const isOnOnboarding = currentSegment === 'onboarding';
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
  }, [hasHydrated, initComplete, hasCompletedOnboarding, segments, router, hasNavigated]);

  // Show loading while hydrating
  if (!hasHydrated || !initComplete) {
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
