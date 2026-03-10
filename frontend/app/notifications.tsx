import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

const NOTIFICATION_SETTINGS_KEY = '@DocScanPro:notificationSettings';

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  scanComplete: boolean;
  exportReady: boolean;
  signatureRequests: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
  tips: boolean;
}

const defaultSettings: NotificationSettings = {
  pushEnabled: true,
  emailEnabled: true,
  scanComplete: true,
  exportReady: true,
  signatureRequests: true,
  securityAlerts: true,
  productUpdates: false,
  tips: false,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const { t } = useLanguage();
  
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.log('Error loading notification settings:', e);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const renderSwitch = (
    key: keyof NotificationSettings,
    title: string,
    description: string,
    icon: string,
    iconColor: string
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <View style={[styles.settingIcon, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={icon as any} size={22} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.settingDesc, { color: colors.textTertiary }]}>{description}</Text>
        </View>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={(value) => updateSetting(key, value)}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* General */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>GENERAL</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadows.sm }]}>
          {renderSwitch(
            'pushEnabled',
            'Push Notifications',
            'Receive notifications on your device',
            'notifications',
            colors.primary
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {renderSwitch(
            'emailEnabled',
            'Email Notifications',
            'Receive updates via email',
            'mail',
            '#7C3AED'
          )}
        </View>

        {/* Activity */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACTIVITY</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadows.sm }]}>
          {renderSwitch(
            'scanComplete',
            'Scan Complete',
            'When document scanning finishes',
            'scan',
            '#059669'
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {renderSwitch(
            'exportReady',
            'Export Ready',
            'When document export is complete',
            'download',
            '#F59E0B'
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {renderSwitch(
            'signatureRequests',
            'Signature Requests',
            'When someone requests your signature',
            'finger-print',
            '#2563EB'
          )}
        </View>

        {/* Security */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SECURITY</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadows.sm }]}>
          {renderSwitch(
            'securityAlerts',
            'Security Alerts',
            'Important security notifications',
            'shield',
            '#DC2626'
          )}
        </View>

        {/* Marketing */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>UPDATES</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadows.sm }]}>
          {renderSwitch(
            'productUpdates',
            'Product Updates',
            'New features and improvements',
            'sparkles',
            '#8B5CF6'
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {renderSwitch(
            'tips',
            'Tips & Tricks',
            'Helpful tips to improve productivity',
            'bulb',
            '#F59E0B'
          )}
        </View>

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.surfaceHighlight }]}>
          <Ionicons name="information-circle" size={20} color={colors.textTertiary} />
          <Text style={[styles.infoText, { color: colors.textTertiary }]}>
            You can manage notification permissions in your device settings.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
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
  
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingTitle: { fontSize: 15, fontWeight: '600' },
  settingDesc: { fontSize: 12, marginTop: 2 },
  
  divider: { height: 1, marginVertical: 8 },
  
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
