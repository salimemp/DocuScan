import React from 'react';
import { ScrollView, View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

const EFFECTIVE_DATE = 'May 1, 2026';
const CONTACT_EMAIL = 'support@docscanpro.app';
const COMPANY_NAME = 'DocScan Pro';

export default function PrivacyPolicy() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ title: 'Privacy Policy', headerShown: true }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator
      >
        <Text style={styles.h1}>Privacy Policy</Text>
        <Text style={styles.meta}>Effective Date: {EFFECTIVE_DATE}</Text>
        <Text style={styles.meta}>Last Updated: {EFFECTIVE_DATE}</Text>

        <Text style={styles.p}>
          {COMPANY_NAME} ("we," "us," or "our") respects your privacy and is committed to
          protecting your personal data. This Privacy Policy explains how we collect, use,
          store, share, and safeguard information when you use our mobile application
          and related services (collectively, the "Service").
        </Text>

        <Text style={styles.h2}>1. Information We Collect</Text>
        <Text style={styles.h3}>1.1 Information You Provide Directly</Text>
        <Text style={styles.p}>
          - <Text style={styles.b}>Account Information:</Text> Email address, hashed password,
          and optional display name when you register.{'\n'}
          - <Text style={styles.b}>Documents & Scans:</Text> Images, PDFs, and OCR text
          you scan, upload, or generate inside the app.{'\n'}
          - <Text style={styles.b}>Feedback Submissions:</Text> Information you voluntarily
          submit through our in-app feedback form (e.g., name, email, message).
        </Text>

        <Text style={styles.h3}>1.2 Information Collected Automatically</Text>
        <Text style={styles.p}>
          - <Text style={styles.b}>Device Data:</Text> Device model, operating system version,
          app version, locale, and unique installation identifiers.{'\n'}
          - <Text style={styles.b}>Usage Data:</Text> Features used, scan counts, session
          duration, and error logs.{'\n'}
          - <Text style={styles.b}>Bot-Protection Tokens:</Text> Cloudflare Turnstile tokens
          used solely to verify you are a human user.
        </Text>

        <Text style={styles.h3}>1.3 Information from Permissions</Text>
        <Text style={styles.p}>
          With your explicit consent, we may access:{'\n'}
          - <Text style={styles.b}>Camera:</Text> To scan documents, math problems, and
          business cards.{'\n'}
          - <Text style={styles.b}>Photo Library:</Text> To import existing images for OCR.{'\n'}
          - <Text style={styles.b}>Contacts (optional):</Text> Only when you choose to save a
          scanned business card directly to your address book.{'\n'}
          - <Text style={styles.b}>Microphone (optional):</Text> Only when you use voice
          commands. Voice data is processed on-device or via the platform's native
          speech-to-text APIs.{'\n'}
          - <Text style={styles.b}>Biometric Data (optional):</Text> Used solely on your
          device for the secure document vault. We never receive or store biometric data.
        </Text>

        <Text style={styles.h2}>2. How We Use Your Information</Text>
        <Text style={styles.p}>
          We use collected information to:{'\n'}
          - Provide, operate, and maintain the Service.{'\n'}
          - Perform OCR, math solving, and document enhancement using AI providers
          (currently Google Gemini).{'\n'}
          - Authenticate users and protect against fraud, abuse, and bots.{'\n'}
          - Send transactional emails (e.g., feedback acknowledgments).{'\n'}
          - Improve and debug the Service through aggregated analytics.{'\n'}
          - Comply with legal obligations.
        </Text>

        <Text style={styles.h2}>3. Third-Party Service Providers</Text>
        <Text style={styles.p}>
          We use the following sub-processors. Each provider has its own privacy
          practices governing how it handles data we share:
        </Text>
        <Text style={styles.p}>
          - <Text style={styles.b}>Google Gemini AI</Text> — Document text extraction (OCR)
          and math problem solving. Images and questions are sent to Google for inference
          and are subject to Google's Generative AI privacy practices.{'\n'}
          - <Text style={styles.b}>Cloudflare Turnstile</Text> — Bot-protection during
          authentication.{'\n'}
          - <Text style={styles.b}>Resend</Text> — Transactional and feedback notification
          emails.{'\n'}
          - <Text style={styles.b}>MongoDB Atlas / hosting providers</Text> — Encrypted storage
          of account data and document metadata.
        </Text>
        <Text style={styles.p}>
          We do <Text style={styles.b}>not</Text> sell your personal data to third parties.
        </Text>

        <Text style={styles.h2}>4. Data Retention</Text>
        <Text style={styles.p}>
          - Account data is retained as long as your account is active.{'\n'}
          - Documents and scans remain stored until you delete them or close your account.{'\n'}
          - Feedback messages are retained for up to 24 months for product-improvement
          purposes.{'\n'}
          - Authentication logs are retained for up to 90 days for security and abuse
          investigation.{'\n'}
          - Upon account deletion, we erase your personal data within 30 days, excluding
          information we are required by law to retain.
        </Text>

        <Text style={styles.h2}>5. Data Security</Text>
        <Text style={styles.p}>
          We implement industry-standard safeguards including:{'\n'}
          - HTTPS/TLS encryption for all network traffic.{'\n'}
          - Hashed and salted passwords.{'\n'}
          - Encryption-at-rest for documents in the secure vault.{'\n'}
          - Rate limiting and bot protection on authentication endpoints.{'\n'}
          - Periodic security reviews and dependency audits.{'\n'}
          {'\n'}
          However, no method of electronic storage or transmission is 100% secure. You use
          the Service at your own risk.
        </Text>

        <Text style={styles.h2}>6. Children's Privacy</Text>
        <Text style={styles.p}>
          The Service is not directed to children under 13. We do not knowingly collect
          personal data from anyone under 13. If you believe a child under 13 has provided
          us with information, please contact us at {CONTACT_EMAIL} and we will promptly
          delete such data.
        </Text>

        <Text style={styles.h2}>7. Your Rights</Text>
        <Text style={styles.p}>
          Depending on your jurisdiction (GDPR, CCPA, UK GDPR, LGPD, etc.), you may have
          the right to:{'\n'}
          - Access the personal data we hold about you.{'\n'}
          - Correct inaccurate or outdated data.{'\n'}
          - Delete your data ("right to be forgotten").{'\n'}
          - Object to or restrict processing.{'\n'}
          - Receive a portable copy of your data.{'\n'}
          - Withdraw consent at any time.{'\n'}
          - Lodge a complaint with your local data protection authority.{'\n'}
          {'\n'}
          To exercise any of these rights, email {CONTACT_EMAIL}. We respond within 30 days.
        </Text>

        <Text style={styles.h2}>8. International Data Transfers</Text>
        <Text style={styles.p}>
          Your data may be processed in countries outside your country of residence,
          including the United States. We rely on Standard Contractual Clauses or
          equivalent legal mechanisms to protect data transferred internationally.
        </Text>

        <Text style={styles.h2}>9. Cookies & Tracking (Web)</Text>
        <Text style={styles.p}>
          The web version of {COMPANY_NAME} uses essential cookies for authentication and
          session management. We do not use third-party advertising cookies or
          cross-site tracking.
        </Text>

        <Text style={styles.h2}>10. Changes to This Policy</Text>
        <Text style={styles.p}>
          We may update this Privacy Policy from time to time. Material changes will be
          announced in the app and via email (if you have provided one). The "Last
          Updated" date above always reflects the most recent version.
        </Text>

        <Text style={styles.h2}>11. Contact Us</Text>
        <Text style={styles.p}>
          For privacy questions, requests, or complaints, contact:{'\n'}
          {'\n'}
          <Text style={styles.b}>{COMPANY_NAME}</Text>{'\n'}
          Email: {CONTACT_EMAIL}{'\n'}
          {'\n'}
          We aim to respond to every privacy inquiry within five (5) business days.
        </Text>

        <Text style={styles.footer}>© {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  h1: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    ...Platform.select({ web: { fontFamily: 'system-ui, -apple-system, sans-serif' } }),
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 24,
    marginBottom: 8,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  p: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1F2937',
    marginBottom: 4,
  },
  b: { fontWeight: '700', color: '#0F172A' },
  footer: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 36,
    marginBottom: 16,
  },
});
