import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Image, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { getWidgetData, WidgetData, WIDGET_TYPES, WIDGET_ACTIONS } from '../utils/widgetData';

const { width: SCREEN_W } = Dimensions.get('window');

export default function WidgetsScreen() {
  const { colors, shadows, isDark } = useTheme();
  const router = useRouter();
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  const [selectedWidget, setSelectedWidget] = useState<string>('small');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getWidgetData();
    setWidgetData(data);
  };

  const renderSmallWidgetPreview = () => (
    <View style={[styles.widgetPreview, styles.smallWidget, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
      <View style={styles.smallWidgetContent}>
        <View style={[styles.widgetAppIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="scan" size={20} color="#FFF" />
        </View>
        <View style={styles.smallWidgetInfo}>
          <Text style={[styles.widgetAppName, { color: colors.textPrimary }]}>DocScan Pro</Text>
          <Text style={[styles.widgetStatText, { color: colors.textSecondary }]}>
            {widgetData?.totalScans || 0} scans
          </Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.widgetQuickAction, { backgroundColor: colors.primary }]}>
        <Ionicons name="camera" size={18} color="#FFF" />
        <Text style={styles.widgetActionText}>Scan</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMediumWidgetPreview = () => (
    <View style={[styles.widgetPreview, styles.mediumWidget, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
      <View style={styles.mediumWidgetHeader}>
        <View style={[styles.widgetAppIconSmall, { backgroundColor: colors.primary }]}>
          <Ionicons name="scan" size={14} color="#FFF" />
        </View>
        <Text style={[styles.widgetHeaderText, { color: colors.textSecondary }]}>DOCSCAN PRO</Text>
      </View>
      <Text style={[styles.mediumWidgetTitle, { color: colors.textPrimary }]}>Recent Documents</Text>
      <View style={styles.recentDocsRow}>
        {(widgetData?.recentDocuments || []).slice(0, 3).map((doc, i) => (
          <View key={doc.id || i} style={[styles.recentDocItem, { backgroundColor: colors.surface }]}>
            <Ionicons name="document-text" size={16} color={colors.primary} />
            <Text style={[styles.recentDocTitle, { color: colors.textPrimary }]} numberOfLines={1}>{doc.title}</Text>
          </View>
        ))}
        {(!widgetData?.recentDocuments || widgetData.recentDocuments.length === 0) && (
          <>
            <View style={[styles.recentDocItem, { backgroundColor: colors.surface }]}>
              <Ionicons name="document-text" size={16} color={colors.primary} />
              <Text style={[styles.recentDocTitle, { color: colors.textTertiary }]}>No documents yet</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderLargeWidgetPreview = () => (
    <View style={[styles.widgetPreview, styles.largeWidget, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
      <View style={styles.mediumWidgetHeader}>
        <View style={[styles.widgetAppIconSmall, { backgroundColor: colors.primary }]}>
          <Ionicons name="scan" size={14} color="#FFF" />
        </View>
        <Text style={[styles.widgetHeaderText, { color: colors.textSecondary }]}>DOCSCAN PRO</Text>
      </View>
      <View style={styles.largeStatsRow}>
        <View style={[styles.largeStat, { backgroundColor: colors.surface }]}>
          <Ionicons name="documents" size={22} color="#3B82F6" />
          <Text style={[styles.largeStatNum, { color: colors.textPrimary }]}>{widgetData?.totalScans || 0}</Text>
          <Text style={[styles.largeStatLabel, { color: colors.textSecondary }]}>Scans</Text>
        </View>
        <View style={[styles.largeStat, { backgroundColor: colors.surface }]}>
          <Ionicons name="cloud" size={22} color="#10B981" />
          <Text style={[styles.largeStatNum, { color: colors.textPrimary }]}>{widgetData?.storageUsed || '0 KB'}</Text>
          <Text style={[styles.largeStatLabel, { color: colors.textSecondary }]}>Storage</Text>
        </View>
      </View>
      <Text style={[styles.largeRecentTitle, { color: colors.textPrimary }]}>Recent</Text>
      {(widgetData?.recentDocuments || []).slice(0, 2).map((doc, i) => (
        <View key={doc.id || i} style={[styles.largeDocRow, { borderTopColor: colors.border }]}>
          <Ionicons name="document-text" size={16} color={colors.primary} />
          <Text style={[styles.largeDocTitle, { color: colors.textPrimary }]} numberOfLines={1}>{doc.title}</Text>
          <Text style={[styles.largeDocDate, { color: colors.textTertiary }]}>
            {new Date(doc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      ))}
      <TouchableOpacity style={[styles.widgetQuickAction, { backgroundColor: colors.primary, alignSelf: 'center', marginTop: 8 }]}>
        <Ionicons name="camera" size={16} color="#FFF" />
        <Text style={styles.widgetActionText}>Quick Scan</Text>
      </TouchableOpacity>
    </View>
  );

  const widgetTypes = [
    { key: 'small', ...WIDGET_TYPES.SMALL },
    { key: 'medium', ...WIDGET_TYPES.MEDIUM },
    { key: 'large', ...WIDGET_TYPES.LARGE },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Home Screen Widgets</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={[styles.infoBanner, { backgroundColor: colors.primary + '12' }]}>
          <Ionicons name="apps" size={28} color={colors.primary} />
          <View style={styles.infoText}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>Widgets at a Glance</Text>
            <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
              Add DocScan Pro widgets to your home screen for quick access to scanning and recent documents.
            </Text>
          </View>
        </View>

        {/* Widget Type Selector */}
        <View style={styles.typeSelector}>
          {widgetTypes.map((w) => (
            <TouchableOpacity
              key={w.key}
              style={[
                styles.typeChip,
                { backgroundColor: selectedWidget === w.key ? colors.primary : colors.surface },
                shadows.sm,
              ]}
              onPress={() => setSelectedWidget(w.key)}
            >
              <Text style={[
                styles.typeChipText,
                { color: selectedWidget === w.key ? '#FFF' : colors.textSecondary },
              ]}>
                {w.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Widget Preview */}
        <View style={styles.previewContainer}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>PREVIEW</Text>
          <View style={[styles.previewFrame, { backgroundColor: isDark ? '#000' : '#E5E5EA' }]}>
            {selectedWidget === 'small' && renderSmallWidgetPreview()}
            {selectedWidget === 'medium' && renderMediumWidgetPreview()}
            {selectedWidget === 'large' && renderLargeWidgetPreview()}
          </View>
        </View>

        {/* Widget Details */}
        <View style={[styles.detailsCard, { backgroundColor: colors.surface }, shadows.sm]}>
          <Text style={[styles.detailsTitle, { color: colors.textPrimary }]}>
            {widgetTypes.find(w => w.key === selectedWidget)?.name}
          </Text>
          <Text style={[styles.detailsDesc, { color: colors.textSecondary }]}>
            {widgetTypes.find(w => w.key === selectedWidget)?.description}
          </Text>
          <View style={styles.detailsMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="resize" size={16} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                {widgetTypes.find(w => w.key === selectedWidget)?.size.width}x{widgetTypes.find(w => w.key === selectedWidget)?.size.height} grid
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="phone-portrait" size={16} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>iOS & Android</Text>
            </View>
          </View>
        </View>

        {/* How to Add */}
        <View style={[styles.howToCard, { backgroundColor: colors.surface }, shadows.sm]}>
          <Text style={[styles.howToTitle, { color: colors.textPrimary }]}>How to Add Widgets</Text>
          <View style={styles.howToStep}>
            <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              {Platform.OS === 'ios' 
                ? 'Long press on your home screen until icons jiggle'
                : 'Long press on an empty area of your home screen'}
            </Text>
          </View>
          <View style={styles.howToStep}>
            <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              {Platform.OS === 'ios'
                ? 'Tap the "+" button in the top-left corner'
                : 'Tap "Widgets" from the menu'}
            </Text>
          </View>
          <View style={styles.howToStep}>
            <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumText}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              Search for "DocScan Pro" and select your preferred widget size
            </Text>
          </View>
        </View>

        {/* Deep Link Actions */}
        <View style={[styles.actionsCard, { backgroundColor: colors.surface }, shadows.sm]}>
          <Text style={[styles.actionsTitle, { color: colors.textPrimary }]}>Widget Quick Actions</Text>
          <Text style={[styles.actionsDesc, { color: colors.textSecondary }]}>
            Tapping a widget opens the app to these actions:
          </Text>
          {[
            { icon: 'camera', label: 'Quick Scan', action: WIDGET_ACTIONS.QUICK_SCAN, color: '#3B82F6' },
            { icon: 'grid', label: 'Dashboard', action: WIDGET_ACTIONS.OPEN_DASHBOARD, color: '#8B5CF6' },
            { icon: 'time', label: 'History', action: WIDGET_ACTIONS.OPEN_HISTORY, color: '#10B981' },
          ].map((item) => (
            <View key={item.label} style={[styles.actionRow, { borderTopColor: colors.border }]}>
              <View style={[styles.actionIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                <Text style={[styles.actionUrl, { color: colors.textTertiary }]}>{item.action}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Current Widget Data */}
        {widgetData && (
          <View style={[styles.dataCard, { backgroundColor: colors.surface }, shadows.sm]}>
            <Text style={[styles.dataTitle, { color: colors.textPrimary }]}>Current Widget Data</Text>
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Total Scans</Text>
              <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{widgetData.totalScans}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Storage Used</Text>
              <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{widgetData.storageUsed}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Recent Docs</Text>
              <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{widgetData.recentDocuments.length}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Last Scan</Text>
              <Text style={[styles.dataValue, { color: colors.textPrimary }]}>
                {widgetData.lastScanDate 
                  ? new Date(widgetData.lastScanDate).toLocaleDateString() 
                  : 'Never'}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 16 },

  infoBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 14 },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  infoDesc: { fontSize: 13, lineHeight: 19 },

  typeSelector: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  typeChipText: { fontSize: 13, fontWeight: '600' },

  previewContainer: { alignItems: 'center' },
  previewLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8, alignSelf: 'flex-start' },
  previewFrame: { width: '100%', borderRadius: 20, padding: 16, alignItems: 'center' },

  // Small Widget
  widgetPreview: { borderRadius: 16, padding: 14, width: '100%' },
  smallWidget: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smallWidgetContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  widgetAppIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  smallWidgetInfo: {},
  widgetAppName: { fontSize: 14, fontWeight: '700' },
  widgetStatText: { fontSize: 12, marginTop: 2 },
  widgetQuickAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  widgetActionText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  // Medium Widget
  mediumWidget: {},
  mediumWidgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  widgetAppIconSmall: { width: 20, height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  widgetHeaderText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  mediumWidgetTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  recentDocsRow: { gap: 6 },
  recentDocItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  recentDocTitle: { fontSize: 13, flex: 1 },

  // Large Widget
  largeWidget: {},
  largeStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  largeStat: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  largeStatNum: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  largeStatLabel: { fontSize: 11, marginTop: 2 },
  largeRecentTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  largeDocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  largeDocTitle: { fontSize: 13, flex: 1 },
  largeDocDate: { fontSize: 11 },

  // Details Card
  detailsCard: { borderRadius: 16, padding: 16 },
  detailsTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  detailsDesc: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  detailsMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12 },

  // How to Card
  howToCard: { borderRadius: 16, padding: 16 },
  howToTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  howToStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 19, paddingTop: 3 },

  // Actions Card
  actionsCard: { borderRadius: 16, padding: 16 },
  actionsTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  actionsDesc: { fontSize: 13, marginBottom: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  actionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionInfo: { flex: 1 },
  actionLabel: { fontSize: 14, fontWeight: '600' },
  actionUrl: { fontSize: 11, marginTop: 2 },

  // Data Card
  dataCard: { borderRadius: 16, padding: 16 },
  dataTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5E5' },
  dataLabel: { fontSize: 13 },
  dataValue: { fontSize: 14, fontWeight: '600' },
});
