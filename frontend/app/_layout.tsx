import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Text, Linking, Platform } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n/i18n';
import { QueryProvider } from '../utils/queryClient';
import { analytics } from '../utils/analytics';
import { useAppStore } from '../utils/appStore';
import { AuthProvider } from '../contexts/AuthContext';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  
  // Use Zustand store for state
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const loadFromStorage = useAppStore((state) => state.loadFromStorage);
  const setAppReady = useAppStore((state) => state.setAppReady);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Load stored state on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        await loadFromStorage();
        await analytics.init();
        setAppReady(true);
      } catch (error) {
        console.log('Init error:', error);
      } finally {
        setIsLoading(false);
        SplashScreen.hideAsync();
      }
    };
    
    initApp();
  }, [loadFromStorage, setAppReady]);

  // Handle navigation based on onboarding status - only once after loading
  useEffect(() => {
    if (isLoading || hasNavigated) return;
    
    const currentSegment = segments[0];
    const isOnOnboarding = currentSegment === 'onboarding';
    const isOnIndex = currentSegment === undefined || currentSegment === ('index' as typeof currentSegment);
    
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
  }, [isLoading, hasCompletedOnboarding, segments, router, hasNavigated]);

  // Handle deep links from widgets
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (!url) return;
      
      try {
        // Parse deep link: docscanpro://scan, docscanpro://dashboard, etc.
        const path = url.replace('docscanpro://', '').replace('exp://', '');
        
        if (path.startsWith('scan')) {
          router.push('/scan');
        } else if (path.startsWith('dashboard')) {
          router.push('/(tabs)/dashboard');
        } else if (path.startsWith('history')) {
          router.push('/(tabs)/history');
        } else if (path.startsWith('document/')) {
          const docId = path.replace('document/', '');
          if (docId) {
            router.push({ pathname: '/document/[id]', params: { id: docId } });
          }
        }
      } catch (e) {
        console.log('Deep link error:', e);
      }
    };

    // Handle deep link when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Handle deep link when app launches
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  // Show loading
  if (isLoading) {
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
      <Stack.Screen
        name="secure-enclave"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="widgets"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="business-card"
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <I18nextProvider i18n={i18n}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <RootLayoutNav />
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </I18nextProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
