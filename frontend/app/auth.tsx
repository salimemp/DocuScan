import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, 
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
  Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
const AUTH_TOKEN_KEY = '@DocScanPro:authToken';
const REFRESH_TOKEN_KEY = '@DocScanPro:refreshToken';
const USER_KEY = '@DocScanPro:user';

WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'login' | 'register' | 'forgot' | 'magic';

export default function AuthScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const { t } = useLanguage();
  const { login, register, isAuthenticated, isLoading: authLoading, user } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthenticated, user]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await login(email, password);
      
      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }
      
      if (result.requires_2fa) {
        // Navigate to 2FA verification
        Alert.alert('2FA Required', 'Two-factor authentication is enabled. Please enter your code.');
        return;
      }
      
      setSuccess('Login successful!');
      setTimeout(() => router.replace('/(tabs)/dashboard'), 500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await register(email, password, name);
      
      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }
      
      setSuccess('Account created! Please check your email to verify.');
      setTimeout(() => router.replace('/(tabs)/dashboard'), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/magic-link/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to send magic link');
      }
      
      setSuccess('Magic link sent! Check your email.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/password/reset-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to send reset link');
      }
      
      setSuccess('Reset link sent! Check your email.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const redirectUrl = Platform.OS === 'web'
        ? `${BACKEND_URL}/`
        : Linking.createURL('/');
      
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        // Extract session_id from URL
        const url = new URL(result.url);
        const sessionId = url.hash.split('session_id=')[1] || url.searchParams.get('session_id');
        
        if (sessionId) {
          setLoading(true);
          const res = await fetch(`${BACKEND_URL}/api/auth/google/callback?session_id=${sessionId}`, {
            method: 'POST',
          });
          
          const data = await res.json();
          
          if (res.ok) {
            await saveAuth(data);
            router.replace('/(tabs)/dashboard');
          } else {
            throw new Error(data.detail || 'Google auth failed');
          }
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    Alert.alert('Coming Soon', 'Apple Sign-In will be available soon!');
  };

  const handleBiometricAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        Alert.alert('Not Available', 'Biometric authentication is not available on this device');
        return;
      }
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to DocScan Pro',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      
      if (result.success) {
        // Check for saved credentials
        const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (savedToken) {
          router.replace('/(tabs)/dashboard');
        } else {
          Alert.alert('No Saved Login', 'Please log in with email/password first');
        }
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const saveAuth = async (data: any) => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  };

  const renderLoginForm = () => (
    <>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
        placeholder="Email"
        placeholderTextColor={colors.textTertiary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
          placeholder="Password"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity 
          style={styles.passwordToggle}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity onPress={() => setMode('forgot')}>
        <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.primaryBtnText}>Sign In</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderRegisterForm = () => (
    <>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
        placeholder="Full Name"
        placeholderTextColor={colors.textTertiary}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
        placeholder="Email"
        placeholderTextColor={colors.textTertiary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity 
          style={styles.passwordToggle}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.primaryBtnText}>Create Account</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderMagicLinkForm = () => (
    <>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Enter your email to receive a magic link for instant sign-in.
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
        placeholder="Email"
        placeholderTextColor={colors.textTertiary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: '#7C3AED' }]}
        onPress={handleMagicLink}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="mail" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>Send Magic Link</Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );

  const renderForgotForm = () => (
    <>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Enter your email to receive a password reset link.
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
        placeholder="Email"
        placeholderTextColor={colors.textTertiary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: '#DC2626' }]}
        onPress={handleForgotPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.primaryBtnText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="document-text" size={40} color="#FFF" />
            </View>
            <Text style={[styles.logoText, { color: colors.textPrimary }]}>DocScan Pro</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {mode === 'login' ? 'Welcome Back' : 
             mode === 'register' ? 'Create Account' :
             mode === 'magic' ? 'Magic Link' : 'Reset Password'}
          </Text>

          {/* Error/Success Messages */}
          {error && (
            <View style={[styles.alertBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={[styles.alertText, { color: '#DC2626' }]}>{error}</Text>
            </View>
          )}
          {success && (
            <View style={[styles.alertBox, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text style={[styles.alertText, { color: '#059669' }]}>{success}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.formContainer}>
            {mode === 'login' && renderLoginForm()}
            {mode === 'register' && renderRegisterForm()}
            {mode === 'magic' && renderMagicLinkForm()}
            {mode === 'forgot' && renderForgotForm()}
          </View>

          {/* Social Login */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or continue with</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <View style={styles.socialButtons}>
                <TouchableOpacity
                  style={[styles.socialBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={handleGoogleAuth}
                >
                  <Ionicons name="logo-google" size={24} color="#DB4437" />
                  <Text style={[styles.socialBtnText, { color: colors.textPrimary }]}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.socialBtn, { backgroundColor: '#000' }]}
                  onPress={handleAppleAuth}
                >
                  <Ionicons name="logo-apple" size={24} color="#FFF" />
                  <Text style={[styles.socialBtnText, { color: '#FFF' }]}>Apple</Text>
                </TouchableOpacity>
              </View>

              {/* Biometric Login */}
              <TouchableOpacity
                style={[styles.biometricBtn, { borderColor: colors.border }]}
                onPress={handleBiometricAuth}
              >
                <Ionicons name="finger-print" size={24} color={colors.primary} />
                <Text style={[styles.biometricText, { color: colors.textPrimary }]}>
                  Sign in with Face ID / Fingerprint
                </Text>
              </TouchableOpacity>

              {/* Magic Link */}
              <TouchableOpacity
                style={styles.magicLinkBtn}
                onPress={() => setMode('magic')}
              >
                <Ionicons name="sparkles" size={18} color="#7C3AED" />
                <Text style={[styles.magicLinkText, { color: '#7C3AED' }]}>
                  Sign in with Magic Link
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Mode Switch */}
          <View style={styles.switchContainer}>
            {mode === 'login' ? (
              <TouchableOpacity onPress={() => { setMode('register'); setError(null); setSuccess(null); }}>
                <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                  Don't have an account? <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            ) : mode === 'register' ? (
              <TouchableOpacity onPress={() => { setMode('login'); setError(null); setSuccess(null); }}>
                <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                  Already have an account? <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => { setMode('login'); setError(null); setSuccess(null); }}>
                <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                  Back to <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Skip for now */}
          <TouchableOpacity 
            style={styles.skipBtn}
            onPress={() => router.replace('/(tabs)/dashboard')}
          >
            <Text style={[styles.skipText, { color: colors.textTertiary }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 40 },
  
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: { fontSize: 24, fontWeight: '700' },
  
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  alertText: { flex: 1, fontSize: 14 },
  
  formContainer: { marginBottom: 24 },
  
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  passwordToggle: {
    position: 'absolute',
    right: 14,
    top: 15,
  },
  
  forgotText: { textAlign: 'right', fontSize: 14, fontWeight: '500', marginBottom: 20 },
  
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 13 },
  
  socialButtons: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
  },
  socialBtnText: { fontSize: 15, fontWeight: '600' },
  
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 16,
  },
  biometricText: { fontSize: 14, fontWeight: '500' },
  
  magicLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  magicLinkText: { fontSize: 14, fontWeight: '600' },
  
  switchContainer: { alignItems: 'center', marginTop: 24 },
  switchText: { fontSize: 14 },
  
  skipBtn: { alignItems: 'center', marginTop: 20, paddingVertical: 12 },
  skipText: { fontSize: 14 },
});
