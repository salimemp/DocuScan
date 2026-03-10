import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

interface SubscriptionTier {
  id: string;
  name: string;
  monthly_price: number;
  annual_price: number;
  features: string[];
  recommended: boolean;
  per_seat: boolean;
  trial_days?: number;
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const { t } = useLanguage();
  
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [currentSub, setCurrentSub] = useState<any>(null);

  useEffect(() => {
    fetchTiers();
    fetchCurrentSubscription();
  }, []);

  const fetchTiers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscriptions/tiers`);
      const data = await res.json();
      setTiers(data.tiers);
    } catch (e) {
      console.error('Failed to fetch tiers:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscriptions/current`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentSub(data.subscription);
      }
    } catch (e) {
      console.error('Failed to fetch current subscription:', e);
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getMonthlyEquivalent = (annualCents: number) => {
    return (annualCents / 12 / 100).toFixed(2);
  };

  const handleSubscribe = async (tier: SubscriptionTier) => {
    setSelectedTier(tier.id);
    setSubscribing(true);
    
    try {
      // For now, show a demo message since Stripe isn't fully configured
      Alert.alert(
        'Subscription Demo',
        `You selected the ${tier.name} plan (${billingPeriod}).\n\nPrice: ${formatPrice(billingPeriod === 'monthly' ? tier.monthly_price : tier.annual_price)}/${billingPeriod === 'monthly' ? 'month' : 'year'}\n\nTo complete the subscription, Stripe payment integration would be triggered here.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => {
            Alert.alert('Success!', 'This is a demo. In production, payment would be processed via Stripe.');
          }}
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to start subscription');
    } finally {
      setSubscribing(false);
      setSelectedTier(null);
    }
  };

  const renderTierCard = (tier: SubscriptionTier) => {
    const isCurrentPlan = currentSub?.tier === tier.id;
    const price = billingPeriod === 'monthly' ? tier.monthly_price : tier.annual_price;
    const savings = billingPeriod === 'annual' 
      ? Math.round((1 - tier.annual_price / (tier.monthly_price * 12)) * 100) 
      : 0;
    
    return (
      <View
        key={tier.id}
        style={[
          styles.tierCard,
          { backgroundColor: colors.surface, ...shadows.md },
          tier.recommended && styles.recommendedCard,
          tier.recommended && { borderColor: colors.primary, borderWidth: 2 },
          isCurrentPlan && { borderColor: '#059669', borderWidth: 2 }
        ]}
      >
        {/* Badge */}
        {tier.recommended && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Ionicons name="star" size={12} color="#FFF" />
            <Text style={styles.badgeText}>MOST POPULAR</Text>
          </View>
        )}
        {isCurrentPlan && (
          <View style={[styles.badge, { backgroundColor: '#059669' }]}>
            <Ionicons name="checkmark-circle" size={12} color="#FFF" />
            <Text style={styles.badgeText}>CURRENT PLAN</Text>
          </View>
        )}

        {/* Header */}
        <Text style={[styles.tierName, { color: colors.textPrimary }]}>{tier.name}</Text>
        
        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={[styles.currency, { color: colors.textSecondary }]}>$</Text>
          <Text style={[styles.price, { color: colors.primary }]}>
            {billingPeriod === 'monthly' 
              ? (tier.monthly_price / 100).toFixed(0)
              : getMonthlyEquivalent(tier.annual_price).split('.')[0]}
          </Text>
          <View style={styles.priceDetails}>
            <Text style={[styles.priceCents, { color: colors.primary }]}>
              .{billingPeriod === 'monthly' 
                ? (tier.monthly_price / 100).toFixed(2).split('.')[1]
                : getMonthlyEquivalent(tier.annual_price).split('.')[1]}
            </Text>
            <Text style={[styles.priceLabel, { color: colors.textTertiary }]}>
              /month{tier.per_seat ? '/user' : ''}
            </Text>
          </View>
        </View>

        {/* Annual billing note */}
        {billingPeriod === 'annual' && (
          <View style={styles.annualNote}>
            <Text style={[styles.annualPrice, { color: colors.textSecondary }]}>
              {formatPrice(tier.annual_price)} billed annually
            </Text>
            <View style={[styles.savingsBadge, { backgroundColor: '#059669' + '20' }]}>
              <Text style={styles.savingsText}>Save {savings}%</Text>
            </View>
          </View>
        )}

        {/* Features */}
        <View style={styles.featuresContainer}>
          {tier.features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[
            styles.ctaBtn,
            { backgroundColor: tier.recommended ? colors.primary : colors.surfaceHighlight },
            isCurrentPlan && { backgroundColor: colors.surfaceHighlight }
          ]}
          onPress={() => handleSubscribe(tier)}
          disabled={subscribing || isCurrentPlan}
        >
          {subscribing && selectedTier === tier.id ? (
            <ActivityIndicator color={tier.recommended ? '#FFF' : colors.primary} />
          ) : (
            <Text style={[
              styles.ctaBtnText,
              { color: tier.recommended ? '#FFF' : colors.primary },
              isCurrentPlan && { color: colors.textTertiary }
            ]}>
              {isCurrentPlan ? 'Current Plan' : 'Get Started'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Choose Your Plan</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            Unlock Full Potential
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Choose the plan that works best for you
          </Text>
        </View>

        {/* Billing Toggle */}
        <View style={[styles.billingToggle, { backgroundColor: colors.surfaceHighlight }]}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              billingPeriod === 'monthly' && { backgroundColor: colors.surface, ...shadows.sm }
            ]}
            onPress={() => setBillingPeriod('monthly')}
          >
            <Text style={[
              styles.toggleText,
              { color: billingPeriod === 'monthly' ? colors.textPrimary : colors.textTertiary }
            ]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              billingPeriod === 'annual' && { backgroundColor: colors.surface, ...shadows.sm }
            ]}
            onPress={() => setBillingPeriod('annual')}
          >
            <View style={styles.toggleContent}>
              <Text style={[
                styles.toggleText,
                { color: billingPeriod === 'annual' ? colors.textPrimary : colors.textTertiary }
              ]}>Annual</Text>
              <View style={[styles.discountBadge, { backgroundColor: '#059669' }]}>
                <Text style={styles.discountText}>-20%</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tier Cards */}
        <View style={styles.tiersContainer}>
          {tiers.map(renderTierCard)}
        </View>

        {/* Free Tier */}
        <View style={[styles.freeTier, { backgroundColor: colors.surface, ...shadows.sm }]}>
          <Text style={[styles.freeTierTitle, { color: colors.textPrimary }]}>Free Plan</Text>
          <Text style={[styles.freeTierDesc, { color: colors.textSecondary }]}>
            5 scans/day • Basic export • 100MB storage
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.continueText, { color: colors.primary }]}>Continue with Free</Text>
          </TouchableOpacity>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustSection}>
          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
            <Text style={[styles.trustText, { color: colors.textSecondary }]}>Secure Payments</Text>
          </View>
          <View style={styles.trustBadge}>
            <Ionicons name="refresh" size={20} color="#2563EB" />
            <Text style={[styles.trustText, { color: colors.textSecondary }]}>Cancel Anytime</Text>
          </View>
          <View style={styles.trustBadge}>
            <Ionicons name="help-circle" size={20} color="#7C3AED" />
            <Text style={[styles.trustText, { color: colors.textSecondary }]}>24/7 Support</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Subscriptions auto-renew until canceled.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  
  scrollContent: { padding: 20 },
  
  heroSection: { alignItems: 'center', marginBottom: 24 },
  heroTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  heroSubtitle: { fontSize: 15, textAlign: 'center' },
  
  billingToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: { fontSize: 15, fontWeight: '600' },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  
  tiersContainer: { gap: 16 },
  
  tierCard: {
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  recommendedCard: {},
  
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  
  tierName: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  
  priceContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  currency: { fontSize: 24, fontWeight: '600', marginTop: 8 },
  price: { fontSize: 56, fontWeight: '800', lineHeight: 60 },
  priceDetails: { marginLeft: 4, marginTop: 12 },
  priceCents: { fontSize: 24, fontWeight: '700' },
  priceLabel: { fontSize: 13 },
  
  annualNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  annualPrice: { fontSize: 13 },
  savingsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savingsText: { color: '#059669', fontSize: 11, fontWeight: '700' },
  
  featuresContainer: { marginBottom: 20 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  featureText: { flex: 1, fontSize: 14, lineHeight: 18 },
  
  ctaBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700' },
  
  freeTier: {
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  freeTierTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  freeTierDesc: { fontSize: 13, marginBottom: 12 },
  continueText: { fontSize: 14, fontWeight: '600' },
  
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 32,
    flexWrap: 'wrap',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: { fontSize: 12 },
  
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 24,
  },
});
