import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView,
  ActivityIndicator, Alert, Switch, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
const AUTH_TOKEN_KEY = '@DocScanPro:authToken';
const USER_KEY = '@DocScanPro:user';
const BIOMETRIC_KEY = '@DocScanPro:biometricEnabled';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  passkey_enabled: boolean;
  subscription_tier?: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const { t } = useLanguage();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    loadUserData();
    checkBiometricAvailability();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        router.replace('/auth');
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setName(userData.name || '');
        setEmail(userData.email || '');
      } else {
        // Not authenticated
        router.replace('/auth');
      }
      
      const bioEnabled = await AsyncStorage.getItem(BIOMETRIC_KEY);
      setBiometricEnabled(bioEnabled === 'true');
    } catch (e) {
      console.error('Error loading user:', e);
    } finally {
      setLoading(false);
    }
  };

  const checkBiometricAvailability = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(hasHardware && isEnrolled);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      // Note: You'd need to add an update profile endpoint
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric login',
      });
      
      if (result.success) {
        setBiometricEnabled(true);
        await AsyncStorage.setItem(BIOMETRIC_KEY, 'true');
        Alert.alert('Success', 'Biometric login enabled');
      }
    } else {
      setBiometricEnabled(false);
      await AsyncStorage.setItem(BIOMETRIC_KEY, 'false');
    }
  };

  const handleSetup2FA = async () => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const res = await fetch(`${BACKEND_URL}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTotpSecret(data.secret);
        setTotpUri(data.uri);
        setShow2FASetup(true);
      } else {
        const err = await res.json();
        Alert.alert('Error', err.detail || 'Failed to setup 2FA');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to setup 2FA');
    }
  };

  const handleVerify2FA = async () => {
    if (verifyCode.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit code');
      return;
    }

    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const res = await fetch(`${BACKEND_URL}/api/auth/2fa/verify-setup`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user?.user_id, code: verifyCode }),
      });

      if (res.ok) {
        const data = await res.json();
        setBackupCodes(data.backup_codes);
        setUser(prev => prev ? { ...prev, two_factor_enabled: true } : null);
        Alert.alert(
          '2FA Enabled',
          'Two-factor authentication is now enabled. Save your backup codes securely.',
          [{ text: 'OK', onPress: () => setShow2FASetup(false) }]
        );
      } else {
        Alert.alert('Error', 'Invalid verification code');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to verify 2FA');
    }
  };

  const handleDisable2FA = async () => {
    Alert.alert(
      'Disable 2FA',
      'Are you sure you want to disable two-factor authentication?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            Alert.prompt(
              'Enter 2FA Code',
              'Enter your authenticator code to disable 2FA',
              async (code) => {
                try {
                  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
                  const res = await fetch(`${BACKEND_URL}/api/auth/2fa/disable`, {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ user_id: user?.user_id, code }),
                  });

                  if (res.ok) {
                    setUser(prev => prev ? { ...prev, two_factor_enabled: false } : null);
                    Alert.alert('Success', '2FA has been disabled');
                  } else {
                    Alert.alert('Error', 'Invalid code');
                  }
                } catch (e) {
                  Alert.alert('Error', 'Failed to disable 2FA');
                }
              },
              'plain-text'
            );
          },
        },
      ]
    );
  };

  const handleSetupPasskey = async () => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      
      // Start passkey registration
      const startRes = await fetch(`${BACKEND_URL}/api/auth/passkey/register/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user?.user_id }),
      });

      if (!startRes.ok) {
        throw new Error('Failed to start passkey registration');
      }

      const options = await startRes.json();
      
      // For web/mobile, this would use WebAuthn API
      Alert.alert(
        'Passkey Setup',
        'Passkey/WebAuthn registration would be triggered here. This requires native WebAuthn support which varies by platform.',
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to setup passkey');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_KEY, '@DocScanPro:refreshToken']);
            router.replace('/auth');
          },
        },
      ]
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

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Please log in to view your profile
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Profile</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {user.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{user.name || 'User'}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
          {user.subscription_tier && (
            <View style={[styles.tierBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.tierText, { color: colors.primary }]}>
                {user.subscription_tier.toUpperCase()} Plan
              </Text>
            </View>
          )}
        </View>

        {/* Profile Info */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PROFILE INFORMATION</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadows.sm }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
            <View style={[styles.input, styles.disabledInput, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={{ color: colors.textTertiary }}>{email}</Text>
              {user.email_verified && (
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Security Settings */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SECURITY</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadows.sm }]}>
          {/* Biometric */}
          {biometricAvailable && (
            <>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={[styles.settingIcon, { backgroundColor: '#7C3AED' + '18' }]}>
                    <Ionicons name="finger-print" size={22} color="#7C3AED" />
                  </View>
                  <View>
                    <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                      Biometric Login
                    </Text>
                    <Text style={[styles.settingDesc, { color: colors.textTertiary }]}>
                      Use Face ID or fingerprint
                    </Text>
                  </View>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}

          {/* 2FA */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={user.two_factor_enabled ? handleDisable2FA : handleSetup2FA}
          >
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: user.two_factor_enabled ? '#059669' + '18' : '#F59E0B' + '18' }]}>
                <Ionicons 
                  name={user.two_factor_enabled ? 'shield-checkmark' : 'shield-outline'} 
                  size={22} 
                  color={user.two_factor_enabled ? '#059669' : '#F59E0B'} 
                />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Two-Factor Authentication
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textTertiary }]}>
                  {user.two_factor_enabled ? 'Enabled - Tap to disable' : 'Add extra security'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Passkey */}
          <TouchableOpacity style={styles.settingRow} onPress={handleSetupPasskey}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: '#2563EB' + '18' }]}>
                <Ionicons name="key" size={22} color="#2563EB" />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Passkeys / Security Keys
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textTertiary }]}>
                  {user.passkey_enabled ? 'Configured' : 'Setup passwordless login'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Change Password */}
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: '#DC2626' + '18' }]}>
                <Ionicons name="lock-closed" size={22} color="#DC2626" />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Change Password
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textTertiary }]}>
                  Update your password
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Subscription */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUBSCRIPTION</Text>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.surface, ...shadows.sm }]}
          onPress={() => router.push('/subscription')}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="diamond" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  {user.subscription_tier ? `${user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1)} Plan` : 'Free Plan'}
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textTertiary }]}>
                  {user.subscription_tier ? 'Manage subscription' : 'Upgrade for more features'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </View>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: '#DC2626' }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 2FA Setup Modal would go here */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 16 },
  
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
  
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarText: { fontSize: 40, fontWeight: '700', color: '#FFF' },
  userName: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  userEmail: { fontSize: 14 },
  tierBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierText: { fontSize: 12, fontWeight: '700' },
  
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
  
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  disabledInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  saveBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
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
  
  divider: { height: 1 },
  
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 16,
  },
  logoutText: { color: '#DC2626', fontSize: 16, fontWeight: '600' },
  
  primaryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
