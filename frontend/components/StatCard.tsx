import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface StatCardProps {
  value: string | number;
  label: string;
  icon: string;
  color: string;
}

export const StatCard = memo(function StatCard({ value, label, icon, color }: StatCardProps) {
  const { colors, shadows } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, ...shadows.sm }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    width: 130,
    alignItems: 'flex-start',
    gap: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default StatCard;
