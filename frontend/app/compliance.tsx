import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

const COMPLIANCE_DATA = [
  {
    id: 'gdpr',
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    region: 'European Union',
    icon: 'shield-checkmark',
    color: '#2563EB',
    description: 'EU regulation on data protection and privacy.',
    features: [
      'Right to access your personal data',
      'Right to rectification of inaccurate data',
      'Right to erasure ("right to be forgotten")',
      'Right to data portability',
      'Right to restrict processing',
      'Right to object to processing',
      'Consent management for data collection',
      'Data breach notification within 72 hours',
    ],
    howWeComply: [
      'Encrypted data storage and transmission',
      'User consent before data collection',
      'Easy data export and deletion options',
      'Regular security audits',
      'Designated Data Protection Officer',
    ],
  },
  {
    id: 'ccpa',
    name: 'CCPA',
    fullName: 'California Consumer Privacy Act',
    region: 'California, USA',
    icon: 'lock-closed',
    color: '#059669',
    description: 'California state law enhancing privacy rights for residents.',
    features: [
      'Right to know what data is collected',
      'Right to delete personal information',
      'Right to opt-out of data sale',
      'Right to non-discrimination',
      'Disclosure of data collection practices',
      'Consumer request verification',
    ],
    howWeComply: [
      'Clear privacy notices at collection point',
      '"Do Not Sell My Info" option available',
      'Free consumer data requests',
      'Verified consumer request process',
      'Annual privacy policy updates',
    ],
  },
  {
    id: 'hipaa',
    name: 'HIPAA',
    fullName: 'Health Insurance Portability and Accountability Act',
    region: 'United States',
    icon: 'medkit',
    color: '#DC2626',
    description: 'US law protecting sensitive patient health information.',
    features: [
      'Protected Health Information (PHI) safeguards',
      'Administrative safeguards',
      'Physical safeguards',
      'Technical safeguards',
      'Breach notification requirements',
      'Business Associate Agreements',
    ],
    howWeComply: [
      'End-to-end encryption for health documents',
      'Access controls and audit trails',
      'Secure document scanning and storage',
      'Employee HIPAA training',
      'Regular risk assessments',
    ],
  },
  {
    id: 'pipeda',
    name: 'PIPEDA',
    fullName: 'Personal Information Protection and Electronic Documents Act',
    region: 'Canada',
    icon: 'leaf',
    color: '#7C3AED',
    description: 'Canadian federal privacy law for private sector organizations.',
    features: [
      'Accountability principle',
      'Identifying purposes',
      'Consent requirements',
      'Limiting collection',
      'Limiting use, disclosure, retention',
      'Accuracy of personal information',
      'Safeguards',
      'Openness and individual access',
    ],
    howWeComply: [
      'Clear purpose identification',
      'Meaningful consent collection',
      'Minimal data collection approach',
      'Secure data retention policies',
      'Accessible privacy policies',
    ],
  },
  {
    id: 'soc2',
    name: 'SOC 2',
    fullName: 'Service Organization Control 2',
    region: 'International',
    icon: 'checkmark-done-circle',
    color: '#F59E0B',
    description: 'Auditing standard for service providers storing customer data.',
    features: [
      'Security - Protection against unauthorized access',
      'Availability - System accessibility as agreed',
      'Processing Integrity - System processing is complete and accurate',
      'Confidentiality - Information designated as confidential is protected',
      'Privacy - Personal information is collected and used appropriately',
    ],
    howWeComply: [
      'Regular third-party security audits',
      'Continuous monitoring and logging',
      'Incident response procedures',
      'Vendor management program',
      'Employee background checks',
    ],
  },
];

export default function ComplianceScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const { t } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('complianceSecurity')}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro Section */}
        <View style={[styles.introCard, { backgroundColor: colors.primary + '10' }]}>
          <View style={[styles.introIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="shield-checkmark" size={28} color="#FFF" />
          </View>
          <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
            {t('yourDataProtected')}
          </Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            {t('complianceIntro')}
          </Text>
        </View>

        {/* Compliance Cards */}
        {COMPLIANCE_DATA.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.complianceCard, { backgroundColor: colors.surface, ...shadows.sm }]}
              onPress={() => toggleExpand(item.id)}
              activeOpacity={0.8}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <View style={styles.cardHeaderText}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <View style={[styles.regionBadge, { backgroundColor: item.color + '15' }]}>
                      <Text style={[styles.regionText, { color: item.color }]}>{item.region}</Text>
                    </View>
                  </View>
                  <Text style={[styles.cardFullName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.fullName}
                  </Text>
                </View>
                <Ionicons 
                  name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                  size={22} 
                  color={colors.textTertiary} 
                />
              </View>

              {/* Expanded Content */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  <Text style={[styles.description, { color: colors.textPrimary }]}>
                    {item.description}
                  </Text>

                  {/* Key Rights/Features */}
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    Key Rights & Features
                  </Text>
                  {item.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={18} color={item.color} />
                      <Text style={[styles.featureText, { color: colors.textPrimary }]}>{feature}</Text>
                    </View>
                  ))}

                  {/* How We Comply */}
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                    How We Comply
                  </Text>
                  {item.howWeComply.map((point, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <Ionicons name="shield" size={18} color="#059669" />
                      <Text style={[styles.featureText, { color: colors.textPrimary }]}>{point}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Contact for Compliance */}
        <View style={[styles.contactCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
          <Ionicons name="mail-outline" size={24} color={colors.primary} />
          <View style={styles.contactText}>
            <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>
              {t('complianceQuestions')}
            </Text>
            <Text style={[styles.contactEmail, { color: colors.primary }]}>
              privacy@docscanpro.com
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.contactBtn, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openURL('mailto:privacy@docscanpro.com')}
          >
            <Text style={styles.contactBtnText}>{t('contact')}</Text>
          </TouchableOpacity>
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

  introCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  complianceCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
  },
  regionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  regionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardFullName: {
    fontSize: 12,
    marginTop: 2,
  },

  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  contactBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  contactBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
