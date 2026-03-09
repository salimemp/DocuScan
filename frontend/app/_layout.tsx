import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n/i18n';
import { QueryProvider } from '../utils/queryClient';
import { analytics } from '../utils/analytics';

const ONBOARDING_KEY = '@DocScanPro:onboardingComplete';

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const hasRedirected = useRef(false);

  const checkOnboardingStatus = useCallback(async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasCompletedOnboarding(completed === 'true');
      
      // Initialize analytics
      await analytics.init();
    } catch (e) {
      console.log('Error checking onboarding:', e);
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  useEffect(() => {
    if (isLoading || hasCompletedOnboarding === null || hasRedirected.current) return;

    const inOnboarding = segments[0] === 'onboarding';
    
    // Only redirect to onboarding once, at initial load
    if (!hasCompletedOnboarding && !inOnboarding) {
      hasRedirected.current = true;
      router.replace('/onboarding');
    }
    // Don't redirect away from onboarding - let the onboarding screen handle its own navigation
  }, [isLoading, hasCompletedOnboarding, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" />
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
