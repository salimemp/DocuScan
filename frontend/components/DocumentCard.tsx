import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Document } from '../data/mockDocuments';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 20 * 2 - 12) / 2;

interface Props {
  doc: Document;
  isGrid: boolean;
  testID?: string;
}

export function DocumentCard({ doc, isGrid, testID }: Props) {
  const { colors, shadows } = useTheme();

  if (isGrid) {
    return (
      <TouchableOpacity
        testID={testID}
        activeOpacity={0.75}
        style={[styles.gridCard, { backgroundColor: colors.surface, width: GRID_CARD_WIDTH, ...shadows.sm }]}
      >
        <View style={[styles.gridThumb, { backgroundColor: doc.color + '18' }]}>
          <Ionicons name={doc.icon as any} size={34} color={doc.color} />
        </View>
        <Text style={[styles.gridTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {doc.name}
        </Text>
        <Text style={[styles.gridDate, { color: colors.textSecondary }]}>{doc.date}</Text>
        <View style={styles.gridFooter}>
          <View style={[styles.badge, { backgroundColor: doc.color + '18' }]}>
            <Text style={[styles.badgeText, { color: doc.color }]}>{doc.type}</Text>
          </View>
          <Text style={[styles.sizeText, { color: colors.textTertiary }]}>{doc.size}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.75}
      style={[styles.listCard, { backgroundColor: colors.surface, ...shadows.sm }]}
    >
      <View style={[styles.listThumb, { backgroundColor: doc.color + '18' }]}>
        <Ionicons name={doc.icon as any} size={28} color={doc.color} />
      </View>
      <View style={styles.listInfo}>
        <Text style={[styles.listTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {doc.name}
        </Text>
        <Text style={[styles.listDate, { color: colors.textSecondary }]}>{doc.date}</Text>
        <View style={styles.listMeta}>
          <View style={[styles.badge, { backgroundColor: doc.color + '18' }]}>
            <Text style={[styles.badgeText, { color: doc.color }]}>{doc.type}</Text>
          </View>
          <Text style={[styles.sizeText, { color: colors.textTertiary }]}>{doc.size}</Text>
          {doc.pages && (
            <Text style={[styles.sizeText, { color: colors.textTertiary }]}>{doc.pages}p</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        testID={`${testID}-menu`}
        activeOpacity={0.7}
        style={styles.menuBtn}
        accessibilityLabel="Document options"
      >
        <Ionicons name="ellipsis-vertical" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flex: 1,
  },
  gridThumb: {
    height: 90,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
    lineHeight: 18,
  },
  gridDate: {
    fontSize: 11,
    marginBottom: 8,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  listThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
    gap: 3,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  listDate: {
    fontSize: 12,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sizeText: {
    fontSize: 11,
  },
});
