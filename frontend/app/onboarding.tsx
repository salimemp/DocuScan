import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  Animated, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { analytics } from '../utils/analytics';
import { markOnboardingComplete } from './_layout';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ONBOARDING_KEY = '@DocScanPro:onboardingComplete';

interface OnboardingSlide {
  id: number;
  icon: string;
  title: string;
  description: string;
  color: string;
  features: string[];
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    icon: 'scan-outline',
    title: 'AI-Powered Scanning',
    description: 'Capture documents with your camera and let our AI extract text instantly in any language.',
    color: '#2563EB',
    features: ['Multi-page scanning', 'Auto text extraction', 'Smart document detection'],
  },
  {
    id: 2,
    icon: 'language-outline',
    title: '13 Languages Supported',
    description: 'Use DocScan Pro in your preferred language with full RTL support.',
    color: '#7C3AED',
    features: ['English, Korean, Tamil, Bengali', 'Hebrew, Arabic (RTL)', 'Japanese, Chinese & more'],
  },
  {
    id: 3,
    icon: 'shield-checkmark-outline',
    title: 'Secure & Protected',
    description: 'Keep your sensitive documents safe with password protection and encrypted storage.',
    color: '#059669',
    features: ['Password protection', 'E-signatures', 'Secure cloud backup'],
  },
  {
    id: 4,
    icon: 'download-outline',
    title: '18+ Export Formats',
    description: 'Export your documents in any format you need - from PDF to EPUB.',
    color: '#DC2626',
    features: ['PDF, DOCX, XLSX, PPTX', 'PNG, JPEG, SVG, WebP', 'EPUB, MOBI, HTML, JSON'],
  },
  {
    id: 5,
    icon: 'rocket-outline',
    title: 'Ready to Start!',
    description: 'You\'re all set to scan, organize, and manage your documents like a pro.',
    color: '#F59E0B',
    features: ['Unlimited scans', 'Smart organization', 'Quick share & export'],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideRef = useRef<any>(null);

  const completeOnboarding = useCallback(async () => {
    if (isNavigating) return; // Prevent double navigation
    setIsNavigating(true);
    
    try {
      // Set the flag BEFORE navigating
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      await analytics.trackOnboardingComplete();
      
      // Small delay to ensure storage is persisted
      setTimeout(() => {
        router.replace('/(tabs)/dashboard');
      }, 100);
    } catch (e) {
      console.log('Error completing onboarding:', e);
      router.replace('/(tabs)/dashboard');
    }
  }, [isNavigating, router]);

  const goToNext = useCallback(() => {
    if (isNavigating) return;
    
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  }, [currentIndex, isNavigating, completeOnboarding]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const skip = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const currentSlide = slides[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: currentSlide.color }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Skip Button */}
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <View style={styles.topBar}>
          <View style={{ width: 60 }} />
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
          <TouchableOpacity onPress={skip} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t('skip')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={[styles.illustrationOuter, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <View style={[styles.illustrationInner, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFFFFF' }]}>
                <Ionicons name={currentSlide.icon as any} size={64} color={currentSlide.color} />
              </View>
            </View>
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          <Text style={styles.slideNumber}>{currentIndex + 1} / {slides.length}</Text>
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.description}>{currentSlide.description}</Text>
          
          {/* Features */}
          <View style={styles.featuresContainer}>
            {currentSlide.features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons name="checkmark-circle" size={20} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Bottom Navigation */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.bottomBar}>
          {currentIndex > 0 ? (
            <TouchableOpacity onPress={goToPrev} style={styles.navBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 56 }} />
          )}
          
          <TouchableOpacity
            onPress={goToNext}
            style={[styles.nextBtn, currentIndex === slides.length - 1 && styles.getStartedBtn]}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>
              {currentIndex === slides.length - 1 ? t('getStarted') : t('next')}
            </Text>
            <Ionicons
              name={currentIndex === slides.length - 1 ? 'rocket' : 'arrow-forward'}
              size={20}
              color={currentSlide.color}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Helper to check if onboarding is complete
export const checkOnboardingComplete = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch {
    return false;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  illustrationContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  illustrationOuter: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationInner: {
    width: '80%',
    height: '80%',
    borderRadius: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBadge: {
    position: 'absolute',
    borderRadius: 20,
    padding: 10,
  },
  floatingBadge1: {
    top: '10%',
    right: '5%',
  },
  floatingBadge2: {
    bottom: '20%',
    left: '0%',
  },
  floatingBadge3: {
    top: '40%',
    right: '-5%',
  },
  textContent: {
    alignItems: 'center',
    width: '100%',
  },
  slideNumber: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  featuresContainer: {
    width: '100%',
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  featureIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  bottomSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 8 : 24,
    paddingTop: 16,
  },
  navBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 30,
  },
  getStartedBtn: {
    paddingHorizontal: 40,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
});
