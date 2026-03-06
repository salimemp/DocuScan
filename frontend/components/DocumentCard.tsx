import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { LazyImage } from './LazyImage';

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    doc_type: string;
    scannedAt: string;
    pages?: any[];
    is_locked?: boolean;
  };
  meta: { emoji: string; color: string };
  onPress: () => void;
}

export const DocumentCard = memo(function DocumentCard({
  document,
  meta,
  onPress,
}: DocumentCardProps) {
  const { colors, shadows } = useTheme();
  const hasImage = document.pages?.[0]?.image;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, ...shadows.sm }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.thumbnail, { backgroundColor: meta.color + '15' }]}>
        {hasImage ? (
          <LazyImage
            source={{ uri: document.pages[0].image }}
            style={styles.thumbnailImage}
            containerStyle={styles.thumbnailContainer}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.emoji}>{meta.emoji}</Text>
        )}
        {document.is_locked && (
          <View style={[styles.lockBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="lock-closed" size={10} color="#FFF" />
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
        {document.title}
      </Text>
      <Text style={[styles.date, { color: colors.textTertiary }]}>
        {new Date(document.scannedAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    width: 148,
    gap: 6,
  },
  thumbnail: {
    height: 96,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    fontSize: 30,
  },
  lockBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  date: {
    fontSize: 11,
  },
});

export default DocumentCard;
