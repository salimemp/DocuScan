import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { mockDocuments } from '../../data/mockDocuments';

const stats = [
  { icon: 'document-text', label: 'Total Scans', value: '24', color: '#2563EB' },
  { icon: 'server-outline', label: 'Storage Used', value: '48.3 MB', color: '#8B5CF6' },
  { icon: 'time', label: 'Last Scan', value: '2h ago', color: '#10B981' },
];

const quickActions = [
  { icon: 'images-outline', label: 'Import Photo', color: '#F59E0B' },
  { icon: 'share-social-outline', label: 'Share Doc', color: '#3B82F6' },
  { icon: 'folder-outline', label: 'New Folder', color: '#10B981' },
  { icon: 'cloud-upload-outline', label: 'Cloud Backup', color: '#8B5CF6' },
];

export default function DashboardScreen() {
  const { colors, shadows, isDark } = useTheme();
  const recentDocs = mockDocuments.slice(0, 5);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting} 👋</Text>
            <Text style={[styles.appTitle, { color: colors.textPrimary }]}>DocScan Pro</Text>
          </View>
          <TouchableOpacity
            testID="settings-btn"
            style={[styles.iconBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
            activeOpacity={0.7}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={21} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.dateText, { color: colors.textTertiary }]}>{today}</Text>

        {/* ── Stats Row ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
          style={styles.statScroll}
        >
          {stats.map((stat, i) => (
            <View
              key={i}
              style={[styles.statCard, { backgroundColor: colors.surface, ...shadows.sm }]}
            >
              <View style={[styles.statIconWrap, { backgroundColor: stat.color + '18' }]}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── Scan CTA ── */}
        <View style={styles.scanSection}>
          <TouchableOpacity
            testID="scan-document-btn"
            activeOpacity={0.85}
            style={[styles.scanBtn, { backgroundColor: colors.primary, ...shadows.lg }]}
          >
            <View style={styles.scanLeft}>
              <View style={styles.scanIconCircle}>
                <Ionicons name="scan-outline" size={30} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.scanTitle}>Scan Document</Text>
                <Text style={styles.scanSubtitle}>Use camera to scan instantly</Text>
              </View>
            </View>
            <View style={styles.scanArrow}>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.9)" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
        </View>
        <View style={styles.quickGrid}>
          {quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              testID={`quick-action-${i}`}
              activeOpacity={0.75}
              style={[styles.quickCard, { backgroundColor: colors.surface, ...shadows.sm }]}
            >
              <View style={[styles.qaIconWrap, { backgroundColor: action.color + '18' }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={[styles.qaLabel, { color: colors.textPrimary }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Scans ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Scans</Text>
          <TouchableOpacity testID="see-all-btn" activeOpacity={0.7}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentRow}
        >
          {recentDocs.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              testID={`recent-doc-${doc.id}`}
              activeOpacity={0.8}
              style={[styles.recentCard, { backgroundColor: colors.surface, ...shadows.md }]}
            >
              <View style={[styles.recentThumb, { backgroundColor: doc.color + '18' }]}>
                <Ionicons name={doc.icon as any} size={30} color={doc.color} />
                <View style={[styles.recentBadge, { backgroundColor: doc.color }]}>
                  <Text style={styles.recentBadgeText}>{doc.type}</Text>
                </View>
              </View>
              <Text style={[styles.recentName, { color: colors.textPrimary }]} numberOfLines={2}>
                {doc.name}
              </Text>
              <Text style={[styles.recentDate, { color: colors.textSecondary }]}>{doc.date}</Text>
              <Text style={[styles.recentSize, { color: colors.textTertiary }]}>{doc.size}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  greeting: { fontSize: 14, fontWeight: '500' },
  appTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  dateText: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statScroll: { marginBottom: 24 },
  statsRow: { paddingHorizontal: 20, gap: 12 },
  statCard: {
    borderRadius: 16,
    padding: 16,
    width: 130,
    alignItems: 'flex-start',
    gap: 8,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, fontWeight: '500' },

  scanSection: { paddingHorizontal: 20, marginBottom: 28 },
  scanBtn: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scanLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scanIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  scanSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  scanArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 28,
  },
  quickCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: { fontSize: 13, fontWeight: '600', flex: 1 },

  recentRow: { paddingHorizontal: 20, gap: 12 },
  recentCard: {
    borderRadius: 16,
    padding: 14,
    width: 148,
    gap: 6,
  },
  recentThumb: {
    height: 96,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  recentBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  recentBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  recentName: { fontSize: 13, fontWeight: '600', lineHeight: 17 },
  recentDate: { fontSize: 11 },
  recentSize: { fontSize: 11 },
});
