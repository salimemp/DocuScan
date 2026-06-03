import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBreakpoint } from '../hooks/useBreakpoint';

interface FaqItem {
  id: string;
  q: string;
  a: string;
  category: 'getting-started' | 'features' | 'account' | 'privacy' | 'troubleshooting';
}

const FAQS: FaqItem[] = [
  // Getting started
  {
    id: 'gs-1',
    category: 'getting-started',
    q: 'How do I scan my first document?',
    a: 'Tap the blue camera button on the Dashboard or use the "+" floating button. Align the document inside the viewfinder — edges are detected automatically. Tap the white shutter button to capture. The scan is auto-straightened and saved to your history.',
  },
  {
    id: 'gs-2',
    category: 'getting-started',
    q: 'What does the Beta Launch mean?',
    a: 'You\'re among the first 100 users to access DocScan Pro for free! All Pro features (unlimited scans, AI OCR, math solver, secure vault, voice commands, all export formats) are unlocked at no cost during the beta period.',
  },
  {
    id: 'gs-3',
    category: 'getting-started',
    q: 'Do I need an internet connection?',
    a: 'Basic scanning works offline. AI-powered features (OCR text extraction, math solver, document categorization) require an internet connection because they use Google Gemini AI in the cloud.',
  },
  // Features
  {
    id: 'ft-1',
    category: 'features',
    q: 'How does the AI math solver work?',
    a: 'Take a photo of any math equation or written problem and DocScan Pro will extract the equation and provide a step-by-step solution. It works for algebra, calculus, geometry, statistics, and most school-level math. Powered by Google Gemini AI.',
  },
  {
    id: 'ft-2',
    category: 'features',
    q: 'What voice commands are supported?',
    a: 'Common voice commands include: "Scan this", "Open vault", "Save document", "Read aloud", "Open math solver", "Show history". Tap the microphone icon on the Dashboard to start listening. Voice processing is done on-device for privacy.',
  },
  {
    id: 'ft-3',
    category: 'features',
    q: 'How do I share my scans?',
    a: 'Open any document in your history → tap the "Share" button. You can share via Email, Messages, AirDrop, Drive, social apps, or save to your Files app. Multiple export formats supported (PDF, JPG, PNG).',
  },
  {
    id: 'ft-4',
    category: 'features',
    q: 'What\'s the Secure Vault?',
    a: 'The Secure Vault is an AES-256 encrypted folder for sensitive documents (IDs, contracts, medical records). It\'s locked with biometric authentication (Face ID, Touch ID, or fingerprint). Your biometric data never leaves the device.',
  },
  {
    id: 'ft-5',
    category: 'features',
    q: 'How accurate is the OCR text extraction?',
    a: 'Our OCR uses Google Gemini AI, providing industry-leading accuracy on printed text (~99%) and good accuracy on handwritten text (~85-95% depending on legibility). 100+ languages supported including English, Spanish, Hindi, Chinese, Arabic, and more.',
  },
  // Account
  {
    id: 'ac-1',
    category: 'account',
    q: 'How do I change my password?',
    a: 'Go to Profile → Account Settings → Change Password. You\'ll need your current password and a new strong password (we recommend 12+ characters with a mix of letters, numbers, and symbols).',
  },
  {
    id: 'ac-2',
    category: 'account',
    q: 'Can I use the same account on multiple devices?',
    a: 'Yes! Sign in with the same email and password on any device. Your scans, history, and vault sync automatically across all your devices via cloud backup.',
  },
  {
    id: 'ac-3',
    category: 'account',
    q: 'How do I delete my account?',
    a: 'You can request account deletion at https://docscanpro.app/delete-account or email support@docscanpro.app. We process all deletion requests within 30 days as per our Privacy Policy.',
  },
  // Privacy
  {
    id: 'pr-1',
    category: 'privacy',
    q: 'Is my data secure?',
    a: 'Yes. All data is encrypted in transit (HTTPS/TLS) and at rest (AES-256 in the vault). Passwords are hashed with bcrypt. We never sell your data. Read our full Privacy Policy at https://docscanpro.app/privacy-policy.',
  },
  {
    id: 'pr-2',
    category: 'privacy',
    q: 'Where are my scans stored?',
    a: 'Scans are stored encrypted on our secure cloud servers (MongoDB Atlas, hosted on AWS). You can also export to your device storage anytime. Scans in the Secure Vault are additionally encrypted with AES-256.',
  },
  {
    id: 'pr-3',
    category: 'privacy',
    q: 'Do you sell my data?',
    a: 'No. We never sell your personal data or scans to third parties. The only third parties involved are infrastructure providers (MongoDB Atlas, Google Gemini for AI, Resend for email) — each bound by strict data processing agreements.',
  },
  // Troubleshooting
  {
    id: 'tr-1',
    category: 'troubleshooting',
    q: 'My scan didn\'t auto-detect edges. What can I do?',
    a: 'Make sure the document has good lighting and high contrast against the background. If auto-detection fails, you can manually adjust edges using the crop tool after capturing. Avoid scanning at extreme angles.',
  },
  {
    id: 'tr-2',
    category: 'troubleshooting',
    q: 'OCR is taking longer than usual',
    a: 'OCR speed depends on your internet connection and document complexity. Typical times: 1-3 seconds for clear printed text, 5-10 seconds for dense or handwritten documents. If consistently slow (>30s), check your connection.',
  },
  {
    id: 'tr-3',
    category: 'troubleshooting',
    q: 'I forgot my password',
    a: 'Tap "Forgot password" on the login screen and enter your email. We\'ll send a password reset link via Resend within minutes. The link expires in 1 hour for security.',
  },
  {
    id: 'tr-4',
    category: 'troubleshooting',
    q: 'The app crashed. How do I report it?',
    a: 'Email a description of what you were doing when it crashed to support@docscanpro.app. Include your device model and OS version. Or use the in-app feedback form (Profile → Send Feedback).',
  },
];

const CATEGORIES = [
  { id: 'getting-started', label: 'Getting Started', icon: 'rocket-outline' as const, color: '#2563EB' },
  { id: 'features',        label: 'Features',        icon: 'star-outline' as const,    color: '#7C3AED' },
  { id: 'account',         label: 'Account',         icon: 'person-outline' as const,  color: '#059669' },
  { id: 'privacy',         label: 'Privacy',         icon: 'shield-outline' as const,  color: '#DC2626' },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: 'build-outline' as const,   color: '#D97706' },
];

export default function HelpFAQ() {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('getting-started');
  const { isAtLeastTablet } = useBreakpoint();

  const handleContactSupport = async () => {
    const subject = encodeURIComponent('DocScan Pro – Support Request');
    const body = encodeURIComponent(`\n\n--- Please describe your issue above. ---\n\nDevice: ${Platform.OS}\nApp version: 2.0.0 (Beta)\n`);
    const url = `mailto:support@docscanpro.app?subject=${subject}&body=${body}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL('mailto:support@docscanpro.app');
      }
    } catch {
      // last resort
      Linking.openURL('mailto:support@docscanpro.app').catch(() => {});
    }
  };

  const filtered = FAQS.filter((f) => f.category === activeCategory);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: 'Help & FAQ', headerShown: true }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isAtLeastTablet && { maxWidth: 820, width: '100%', alignSelf: 'center' },
        ]}
        showsVerticalScrollIndicator
      >
        <Text style={styles.heroTitle}>How can we help?</Text>
        <Text style={styles.heroSubtitle}>
          Browse FAQs, get troubleshooting tips, or contact support.
        </Text>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={handleContactSupport} activeOpacity={0.8}>
            <Ionicons name="mail-outline" size={22} color="#2563EB" />
            <Text style={styles.quickActionLabel}>Email Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/feedback')} activeOpacity={0.8}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#7C3AED" />
            <Text style={styles.quickActionLabel}>Send Feedback</Text>
          </TouchableOpacity>
        </View>

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryRow}
          contentContainerStyle={styles.categoryRowContent}
        >
          {CATEGORIES.map((cat) => {
            const active = cat.id === activeCategory;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, active && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => { setActiveCategory(cat.id); setOpenId(null); }}
                activeOpacity={0.7}
              >
                <Ionicons name={cat.icon} size={16} color={active ? '#fff' : cat.color} />
                <Text style={[styles.categoryLabel, { color: active ? '#fff' : cat.color }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* FAQ items */}
        <View style={styles.faqList}>
          {filtered.map((f) => {
            const isOpen = openId === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={styles.faqItem}
                onPress={() => setOpenId(isOpen ? null : f.id)}
                activeOpacity={0.85}
              >
                <View style={styles.faqQRow}>
                  <Text style={styles.faqQ}>{f.q}</Text>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#64748B"
                  />
                </View>
                {isOpen && <Text style={styles.faqA}>{f.a}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom card */}
        <View style={styles.contactCard}>
          <Ionicons name="help-buoy-outline" size={32} color="#2563EB" />
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactSubtitle}>
            Email our support team and we&apos;ll respond within 24 hours.
          </Text>
          <TouchableOpacity style={styles.contactBtn} onPress={handleContactSupport} activeOpacity={0.85}>
            <Ionicons name="mail" size={18} color="#fff" />
            <Text style={styles.contactBtnText}>Contact Support</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://docscanpro.app/privacy-policy')} activeOpacity={0.7}>
            <Text style={styles.linkText}>Read Privacy Policy →</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>DocScan Pro v2.0.0 (Beta)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  heroSubtitle: { fontSize: 15, color: '#64748B', marginBottom: 20, lineHeight: 22 },

  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }),
  },
  quickActionLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },

  categoryRow: { marginHorizontal: -20, marginBottom: 18 },
  categoryRowContent: { paddingHorizontal: 20, gap: 8 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  categoryLabel: { fontSize: 13, fontWeight: '700' },

  faqList: { gap: 10 },
  faqItem: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  faqQRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  faqQ: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', lineHeight: 22 },
  faqA: { fontSize: 14, color: '#475569', lineHeight: 22, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  contactCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 22,
    marginTop: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  contactTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 10 },
  contactSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 20, marginBottom: 16 },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563EB', paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 24, marginBottom: 14,
  },
  contactBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  linkText: { color: '#2563EB', fontSize: 13, fontWeight: '600' },

  versionText: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 28 },
});
