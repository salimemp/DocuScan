import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Animated,
  Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { analytics } from '../utils/analytics';

const CONSENT_KEY = '@DocScanPro:cookieConsent';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CookieConsentProps {
  onAccept?: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentProps> = ({ onAccept }) => {
  const { colors, shadows } = useTheme();
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const slideAnim = useState(new Animated.Value(200))[0];
  
  // Preferences state
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [functionalEnabled, setFunctionalEnabled] = useState(true);

  useEffect(() => {
    checkConsent();
  }, []);

  const checkConsent = async () => {
    try {
      const consent = await AsyncStorage.getItem(CONSENT_KEY);
      if (!consent) {
        setVisible(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }).start();
      }
    } catch (e) {
      console.log('Error checking consent:', e);
    }
  };

  const saveConsent = async (preferences: object) => {
    try {
      await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(preferences));
      
      // Track consent in analytics
      await analytics.trackConsent(preferences as any);
      
      Animated.timing(slideAnim, {
        toValue: 200,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        onAccept?.();
      });
    } catch (e) {
      console.log('Error saving consent:', e);
    }
  };

  const acceptAll = () => {
    saveConsent({
      essential: true,
      functional: true,
      analytics: true,
      acceptedAt: new Date().toISOString(),
    });
  };

  const acceptSelected = () => {
    saveConsent({
      essential: true,
      functional: functionalEnabled,
      analytics: analyticsEnabled,
      acceptedAt: new Date().toISOString(),
    });
  };

  const openPrivacyPolicy = () => {
    // In a real app, this would navigate to the privacy policy screen
    // For now, we'll just log it
    console.log('Open Privacy Policy');
  };

  const openTermsOfService = () => {
    // In a real app, this would navigate to the terms screen
    console.log('Open Terms of Service');
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.surface, ...shadows.lg },
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {!showPreferences ? (
        // Main consent view
        <>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('cookieConsentTitle')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('cookieConsentDesc')}
              </Text>
            </View>
          </View>

          <View style={styles.links}>
            <TouchableOpacity onPress={openPrivacyPolicy} style={styles.link}>
              <Ionicons name="document-text-outline" size={16} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>{t('privacyPolicy')}</Text>
            </TouchableOpacity>
            <View style={[styles.linkDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity onPress={openTermsOfService} style={styles.link}>
              <Ionicons name="reader-outline" size={16} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>{t('termsOfService')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.manageBtn, { borderColor: colors.border }]}
              onPress={() => setShowPreferences(true)}
            >
              <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.manageBtnText, { color: colors.textSecondary }]}>
                {t('managePreferences')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
              onPress={acceptAll}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              <Text style={styles.acceptBtnText}>{t('acceptAll')}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        // Preferences view
        <>
          <View style={styles.prefHeader}>
            <TouchableOpacity onPress={() => setShowPreferences(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.prefTitle, { color: colors.textPrimary }]}>
              {t('cookiePreferences')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.prefOptions}>
            {/* Essential - Always on */}
            <View style={[styles.prefOption, { backgroundColor: colors.surfaceHighlight }]}>
              <View style={styles.prefOptionInfo}>
                <Text style={[styles.prefOptionTitle, { color: colors.textPrimary }]}>
                  {t('essentialCookies')}
                </Text>
                <Text style={[styles.prefOptionDesc, { color: colors.textTertiary }]}>
                  {t('essentialCookiesDesc')}
                </Text>
              </View>
              <View style={[styles.alwaysOnBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.alwaysOnText, { color: colors.success }]}>{t('alwaysOn')}</Text>
              </View>
            </View>

            {/* Functional */}
            <TouchableOpacity
              style={[styles.prefOption, { backgroundColor: colors.surfaceHighlight }]}
              onPress={() => setFunctionalEnabled(!functionalEnabled)}
            >
              <View style={styles.prefOptionInfo}>
                <Text style={[styles.prefOptionTitle, { color: colors.textPrimary }]}>
                  {t('functionalCookies')}
                </Text>
                <Text style={[styles.prefOptionDesc, { color: colors.textTertiary }]}>
                  {t('functionalCookiesDesc')}
                </Text>
              </View>
              <View style={[
                styles.toggle,
                { backgroundColor: functionalEnabled ? colors.primary : colors.border }
              ]}>
                <View style={[
                  styles.toggleKnob,
                  functionalEnabled && styles.toggleKnobActive
                ]} />
              </View>
            </TouchableOpacity>

            {/* Analytics */}
            <TouchableOpacity
              style={[styles.prefOption, { backgroundColor: colors.surfaceHighlight }]}
              onPress={() => setAnalyticsEnabled(!analyticsEnabled)}
            >
              <View style={styles.prefOptionInfo}>
                <Text style={[styles.prefOptionTitle, { color: colors.textPrimary }]}>
                  {t('analyticsCookies')}
                </Text>
                <Text style={[styles.prefOptionDesc, { color: colors.textTertiary }]}>
                  {t('analyticsCookiesDesc')}
                </Text>
              </View>
              <View style={[
                styles.toggle,
                { backgroundColor: analyticsEnabled ? colors.primary : colors.border }
              ]}>
                <View style={[
                  styles.toggleKnob,
                  analyticsEnabled && styles.toggleKnobActive
                ]} />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={acceptSelected}
          >
            <Text style={styles.saveBtnText}>{t('savePreferences')}</Text>
          </TouchableOpacity>
        </>
      )}
    </Animated.View>
  );
};

// Helper to check if consent was given
export const checkCookieConsent = async (): Promise<boolean> => {
  try {
    const consent = await AsyncStorage.getItem(CONSENT_KEY);
    return consent !== null;
  } catch {
    return false;
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  linkDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  manageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  manageBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  // Preferences styles
  prefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  prefOptions: {
    gap: 10,
    marginBottom: 16,
  },
  prefOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
  },
  prefOptionInfo: {
    flex: 1,
    marginRight: 12,
  },
  prefOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  prefOptionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  alwaysOnBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  alwaysOnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default CookieConsentBanner;
