/**
 * BetaBanner - Persistent beta indicator component
 * Shows a sleek beta badge and spots-remaining counter
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

interface BetaStatus {
  is_beta: boolean;
  version: string;
  max_users: number;
  current_users: number;
  spots_remaining: number;
  is_open: boolean;
  message: string;
  features: string[];
}

export function BetaBadge() {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.badge, { backgroundColor: '#F59E0B' + '20' }]}>
      <Ionicons name="flask" size={10} color="#F59E0B" />
      <Text style={styles.badgeText}>BETA</Text>
    </View>
  );
}

export function BetaBanner({ compact = false }: { compact?: boolean }) {
  const { colors, shadows } = useTheme();
  const router = useRouter();
  const [betaStatus, setBetaStatus] = useState<BetaStatus | null>(null);

  useEffect(() => {
    fetchBetaStatus();
  }, []);

  const fetchBetaStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/beta/status`);
      if (res.ok) {
        const data = await res.json();
        setBetaStatus(data);
      }
    } catch {
      // Silently fail - beta banner is non-critical
    }
  };

  if (!betaStatus) return null;

  if (compact) {
    return (
      <View style={[styles.compactBanner, { backgroundColor: '#F59E0B' + '12' }]}>
        <View style={styles.compactLeft}>
          <Ionicons name="flask" size={14} color="#F59E0B" />
          <Text style={[styles.compactText, { color: '#B45309' }]}>
            Beta · {betaStatus.spots_remaining} spots left
          </Text>
        </View>
        <Text style={[styles.compactVersion, { color: '#92400E' }]}>
          v{betaStatus.version}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push('/subscription')}
      style={[styles.banner, { backgroundColor: colors.surface, ...shadows.md }]}
    >
      {/* Gradient-like top accent */}
      <View style={styles.bannerAccent} />
      
      <View style={styles.bannerContent}>
        <View style={styles.bannerLeft}>
          <View style={styles.betaIconWrap}>
            <Ionicons name="flask" size={22} color="#F59E0B" />
          </View>
          <View style={styles.bannerTextWrap}>
            <View style={styles.bannerTitleRow}>
              <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
                Beta Launch
              </Text>
              <View style={[styles.liveBadge, { backgroundColor: '#059669' + '20' }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
              All Pro features free for first 100 users
            </Text>
          </View>
        </View>
        
        {/* Spots counter */}
        <View style={styles.spotsWrap}>
          <Text style={[styles.spotsNumber, { color: '#F59E0B' }]}>
            {betaStatus.spots_remaining}
          </Text>
          <Text style={[styles.spotsLabel, { color: colors.textTertiary }]}>
            spots left
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBg, { backgroundColor: colors.surfaceHighlight }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${(betaStatus.current_users / betaStatus.max_users) * 100}%`,
                backgroundColor: betaStatus.spots_remaining < 20 ? '#DC2626' : '#F59E0B'
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>
          {betaStatus.current_users}/{betaStatus.max_users} beta users joined
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  
  // Compact banner
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 8,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactVersion: {
    fontSize: 10,
    fontWeight: '500',
  },
  
  // Full banner
  banner: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerAccent: {
    height: 3,
    backgroundColor: '#F59E0B',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  betaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F59E0B' + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  spotsWrap: {
    alignItems: 'center',
    paddingLeft: 12,
  },
  spotsNumber: {
    fontSize: 28,
    fontWeight: '800',
  },
  spotsLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  
  // Progress
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});
