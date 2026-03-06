import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { getScanPages, clearScanData } from '../utils/scanStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
const { width: SCREEN_W } = Dimensions.get('window');

// ── Document type metadata ────────────────────────────────────────────────────
const DOC_META: Record<string, { emoji: string; color: string; label: string }> = {
  passport: { emoji: '🛂', color: '#2563EB', label: 'Passport' },
  national_id: { emoji: '🪪', color: '#7C3AED', label: 'National ID' },
  drivers_license: { emoji: '🚗', color: '#D97706', label: "Driver's License" },
  invoice: { emoji: '📄', color: '#059669', label: 'Invoice' },
  receipt: { emoji: '🧾', color: '#0891B2', label: 'Receipt' },
  business_card: { emoji: '💼', color: '#DC2626', label: 'Business Card' },
  contract: { emoji: '📜', color: '#7C3AED', label: 'Contract' },
  bank_statement: { emoji: '🏦', color: '#0284C7', label: 'Bank Statement' },
  medical_record: { emoji: '🏥', color: '#DC2626', label: 'Medical Record' },
  prescription: { emoji: '💊', color: '#7C3AED', label: 'Prescription' },
  handwritten_note: { emoji: '✍️', color: '#92400E', label: 'Handwritten Note' },
  certificate: { emoji: '🏆', color: '#B45309', label: 'Certificate' },
  legal_document: { emoji: '⚖️', color: '#374151', label: 'Legal Document' },
  academic_transcript: { emoji: '🎓', color: '#1D4ED8', label: 'Academic Transcript' },
  tax_document: { emoji: '📊', color: '#059669', label: 'Tax Document' },
  insurance_document: { emoji: '🛡️', color: '#0369A1', label: 'Insurance' },
  utility_bill: { emoji: '💡', color: '#D97706', label: 'Utility Bill' },
  general_document: { emoji: '📋', color: '#6B7280', label: 'Document' },
};

const getMeta = (type: string) =>
  DOC_META[type] ?? DOC_META.general_document;

// ── Formatted Output Renderer ─────────────────────────────────────────────────
function FormattedOutput({ text, colors }: { text: string; colors: any }) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <View>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (!trimmed) return <View key={i} style={{ height: 6 }} />;

        // Divider lines
        if (/^[━─=─]+$/.test(trimmed)) {
          return <View key={i} style={[styles.foDivider, { backgroundColor: colors.border }]} />;
        }

        // Emoji header line (e.g. "🛂 PASSPORT")
        if (/^\p{Emoji}/u.test(trimmed)) {
          return (
            <Text key={i} style={[styles.foDocHeader, { color: colors.primary }]}>
              {line}
            </Text>
          );
        }

        // All-caps label (section titles)
        if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !/[0-9:]/.test(trimmed)) {
          return (
            <Text key={i} style={[styles.foSectionTitle, { color: colors.textSecondary }]}>
              {trimmed}
            </Text>
          );
        }

        // KEY: VALUE pair
        const kvMatch = trimmed.match(/^([^:]+):\s+(.+)$/);
        if (kvMatch && kvMatch[1].length < 40) {
          return (
            <View key={i} style={styles.foFieldRow}>
              <Text style={[styles.foFieldKey, { color: colors.textSecondary }]}>{kvMatch[1].trim()}</Text>
              <Text style={[styles.foFieldVal, { color: colors.textPrimary }]} selectable>
                {kvMatch[2].trim()}
              </Text>
            </View>
          );
        }

        // List item
        if (trimmed.startsWith('▸') || trimmed.startsWith('•') || trimmed.startsWith('-')) {
          return (
            <View key={i} style={styles.foListRow}>
              <Text style={[styles.foBullet, { color: colors.primary }]}>▸</Text>
              <Text key={i} style={[styles.foListItem, { color: colors.textPrimary }]} selectable>
                {trimmed.slice(1).trim()}
              </Text>
            </View>
          );
        }

        // MRZ lines (alphanumeric + < chars only)
        if (/^[A-Z0-9<]{20,}$/.test(trimmed)) {
          return (
            <Text key={i} style={[styles.foMrz, { color: colors.textPrimary, backgroundColor: colors.surfaceHighlight }]} selectable>
              {trimmed}
            </Text>
          );
        }

        // Default body text
        return (
          <Text key={i} style={[styles.foBody, { color: colors.textPrimary }]} selectable>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

// ── Main Preview Screen ────────────────────────────────────────────────────────
export default function PreviewScreen() {
  const router = useRouter();
  const { colors, shadows, isDark } = useTheme();
  const { t } = useLanguage();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState(0);

  const pages = getScanPages();
  const pageCount = pages.length;
  const currentPage = pages[selectedPage];

  const analyze = useCallback(async () => {
    if (pageCount === 0) {
      setError('No images found. Please scan again.');
      setIsAnalyzing(false);
      return;
    }
    try {
      // Send all pages to the backend for analysis
      const images = pages.map(p => p.base64);
      const res = await fetch(`${BACKEND_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, mime_type: 'image/jpeg' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Analysis failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
    }
  }, [pages, pageCount]);

  useEffect(() => { analyze(); }, []);

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      // Create thumbnails array from all pages
      const pagesThumbnails = pages.map(p => p.thumbnailBase64);
      const res = await fetch(`${BACKEND_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...result,
          image_thumbnail: pagesThumbnails[0] || null,
          pages_thumbnails: pagesThumbnails,
          pages_count: pageCount,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? 'Save failed');
      }
      clearScanData();
      router.replace('/dashboard');
    } catch (e: any) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    clearScanData();
    router.back();
  };

  const meta = result ? getMeta(result.document_type) : getMeta('general_document');
  const confidencePct = result ? Math.round((result.confidence ?? 0) * 100) : 0;

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isAnalyzing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingCard, { backgroundColor: colors.surface, ...shadows.lg }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>
            Analyzing {pageCount} Page{pageCount !== 1 ? 's' : ''}
          </Text>
          <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
            AI is reading your document in all languages...
          </Text>
          <View style={styles.loadingDots}>
            {['Detecting type', 'Extracting text', 'Structuring data'].map((step, i) => (
              <View key={i} style={styles.loadingStep}>
                <View style={[styles.loadingDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.loadingStepText, { color: colors.textSecondary }]}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
        {currentPage?.thumbnailBase64 && (
          <Image
            source={{ uri: `data:image/jpeg;base64,${currentPage.thumbnailBase64}` }}
            style={styles.loadingThumb}
          />
        )}
      </View>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconWrap, { backgroundColor: colors.error + '18' }]}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Analysis Failed</Text>
          <Text style={[styles.errorMsg, { color: colors.textSecondary }]}>{error}</Text>
          {error.includes('API key') && (
            <Text style={[styles.errorHint, { color: colors.textTertiary }]}>
              Add your GEMINI_API_KEY to backend/.env and restart the server.
            </Text>
          )}
          <TouchableOpacity
            testID="retry-btn"
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setError(null); setIsAnalyzing(true); analyze(); }}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={18} color="#FFF" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="go-back-btn"
            style={styles.discardLink}
            onPress={handleDiscard}
            activeOpacity={0.7}
          >
            <Text style={[styles.discardLinkText, { color: colors.textSecondary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Success — Preview ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          testID="preview-back-btn"
          onPress={handleDiscard}
          activeOpacity={0.7}
          style={styles.headerBack}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('documentPreview')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Document type hero row */}
        <View style={[styles.heroCard, { backgroundColor: meta.color + '12', borderColor: meta.color + '30' }]}>
          <View style={styles.heroLeft}>
            {currentPage?.thumbnailBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${currentPage.thumbnailBase64}` }}
                style={styles.heroThumb}
              />
            ) : (
              <View style={[styles.heroThumbPlaceholder, { backgroundColor: meta.color + '20' }]}>
                <Text style={styles.heroEmoji}>{meta.emoji}</Text>
              </View>
            )}
          </View>
          <View style={styles.heroRight}>
            <View style={[styles.docTypeBadge, { backgroundColor: meta.color }]}>
              <Text style={styles.docTypeBadgeText}>{meta.emoji} {meta.label}</Text>
            </View>
            {result.document_subtype && (
              <Text style={[styles.docSubtype, { color: colors.textSecondary }]}>{result.document_subtype}</Text>
            )}
            <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {result.title}
            </Text>
            <View style={styles.heroMeta}>
              <View style={[styles.langBadge, { backgroundColor: colors.surface }]}>
                <Ionicons name="language-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.langText, { color: colors.textSecondary }]}>
                  {result.detected_language ?? 'Unknown'}
                </Text>
              </View>
              <View style={[styles.langBadge, { backgroundColor: colors.surface }]}>
                <Ionicons name="document-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.langText, { color: colors.textSecondary }]}>
                  {pageCount} page{pageCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Page thumbnails for multi-page documents */}
        {pageCount > 1 && (
          <View style={[styles.pagesSection, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <Text style={[styles.cardSectionTitle, { color: colors.textSecondary, marginBottom: 12 }]}>
              Pages ({pageCount})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pagesRow}>
              {pages.map((page, index) => (
                <TouchableOpacity
                  key={index}
                  testID={`preview-page-${index}`}
                  onPress={() => setSelectedPage(index)}
                  style={[
                    styles.pageThumb,
                    selectedPage === index && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${page.thumbnailBase64}` }}
                    style={styles.pageThumbImg}
                  />
                  <View style={[styles.pageNumber, { backgroundColor: selectedPage === index ? colors.primary : 'rgba(0,0,0,0.6)' }]}>
                    <Text style={styles.pageNumberText}>{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Confidence bar */}
        <View style={[styles.confRow, { backgroundColor: colors.surface, ...shadows.sm }]}>
          <View style={styles.confLabel}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
            <Text style={[styles.confText, { color: colors.textSecondary }]}>AI Confidence</Text>
          </View>
          <View style={[styles.confBarBg, { backgroundColor: colors.surfaceHighlight }]}>
            <View style={[styles.confBarFill, { width: `${confidencePct}%`, backgroundColor: colors.success }]} />
          </View>
          <Text style={[styles.confPct, { color: colors.success }]}>{confidencePct}%</Text>
        </View>

        {/* Summary */}
        {result.summary && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <Text style={[styles.cardSectionTitle, { color: colors.textSecondary }]}>Summary</Text>
            <Text style={[styles.summaryText, { color: colors.textPrimary }]}>{result.summary}</Text>
          </View>
        )}

        {/* Formatted Output */}
        {result.formatted_output && (
          <View style={[styles.outputCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="document-text-outline" size={17} color={colors.primary} />
              <Text style={[styles.cardSectionTitle, { color: colors.textSecondary }]}>Extracted Document</Text>
            </View>
            <FormattedOutput text={result.formatted_output} colors={colors} />
          </View>
        )}

        {/* Structured Fields */}
        {result.structured_fields && Object.keys(result.structured_fields).length > 0 && (
          <View style={[styles.outputCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="list-outline" size={17} color={colors.primary} />
              <Text style={[styles.cardSectionTitle, { color: colors.textSecondary }]}>Structured Fields</Text>
            </View>
            <StructuredFieldsView fields={result.structured_fields} colors={colors} />
          </View>
        )}

        {/* Extracted entities */}
        {(result.extracted_dates?.length > 0 || result.extracted_amounts?.length > 0 || result.extracted_names?.length > 0) && (
          <View style={[styles.outputCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="sparkles-outline" size={17} color={colors.primary} />
              <Text style={[styles.cardSectionTitle, { color: colors.textSecondary }]}>Key Entities</Text>
            </View>
            {result.extracted_dates?.length > 0 && (
              <EntityRow icon="calendar-outline" label="Dates" items={result.extracted_dates} color="#2563EB" colors={colors} />
            )}
            {result.extracted_amounts?.length > 0 && (
              <EntityRow icon="cash-outline" label="Amounts" items={result.extracted_amounts} color="#059669" colors={colors} />
            )}
            {result.extracted_names?.length > 0 && (
              <EntityRow icon="person-outline" label="Names" items={result.extracted_names} color="#7C3AED" colors={colors} />
            )}
          </View>
        )}

        {/* Tags */}
        {result.tags?.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={[styles.cardSectionTitle, { color: colors.textSecondary, paddingHorizontal: 20, marginBottom: 10 }]}>Tags</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
              {result.tags.map((tag: string, i: number) => (
                <View key={i} style={[styles.tagChip, { backgroundColor: meta.color + '15', borderColor: meta.color + '30' }]}>
                  <Text style={[styles.tagText, { color: meta.color }]}>#{tag}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom action bar */}
      <SafeAreaView edges={['bottom']} style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          testID="discard-btn"
          style={[styles.discardBtn, { borderColor: colors.border }]}
          onPress={handleDiscard}
          activeOpacity={0.75}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.discardBtnText, { color: colors.textSecondary }]}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="save-document-btn"
          style={[styles.saveBtn, { backgroundColor: colors.primary }, isSaving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Ionicons name="save-outline" size={18} color="#FFF" />}
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save to History'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}

// ── Structured Fields Renderer ────────────────────────────────────────────────
function StructuredFieldsView({ fields, colors }: { fields: Record<string, any>; colors: any }) {
  const renderValue = (val: any): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  return (
    <View style={styles.sfGrid}>
      {Object.entries(fields).map(([key, val], i) => {
        if (typeof val === 'object' && !Array.isArray(val) && val !== null) return null;
        const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const displayVal = Array.isArray(val) ? val.join(', ') : renderValue(val);
        return (
          <View key={i} style={[styles.sfRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sfKey, { color: colors.textSecondary }]}>{displayKey}</Text>
            <Text style={[styles.sfVal, { color: colors.textPrimary }]} selectable numberOfLines={3}>
              {displayVal}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Entity Row ────────────────────────────────────────────────────────────────
function EntityRow({ icon, label, items, color, colors }: any) {
  return (
    <View style={styles.entityRow}>
      <View style={styles.entityLabelRow}>
        <Ionicons name={icon} size={13} color={color} />
        <Text style={[styles.entityLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <View style={styles.entityChips}>
        {items.slice(0, 6).map((item: string, i: number) => (
          <View key={i} style={[styles.entityChip, { backgroundColor: color + '15' }]}>
            <Text style={[styles.entityChipText, { color: color }]}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingCard: {
    borderRadius: 24, padding: 32, alignItems: 'center', gap: 14,
    width: '100%', maxWidth: 340,
  },
  loadingTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  loadingSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  loadingDots: { gap: 8, marginTop: 8 },
  loadingStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingDot: { width: 8, height: 8, borderRadius: 4 },
  loadingStepText: { fontSize: 13 },
  loadingThumb: {
    width: 80, height: 100, borderRadius: 12,
    marginTop: 20, opacity: 0.5,
  },

  // Error
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  errorIconWrap: { width: 84, height: 84, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  errorMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorHint: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8,
  },
  retryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  discardLink: { paddingVertical: 10 },
  discardLinkText: { fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5,
  },
  headerBack: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },

  scrollContent: { paddingBottom: 32 },

  // Hero card
  heroCard: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 16,
    borderRadius: 20, padding: 16, borderWidth: 1, gap: 14,
  },
  heroLeft: {},
  heroThumb: { width: 72, height: 90, borderRadius: 10, resizeMode: 'cover' },
  heroThumbPlaceholder: { width: 72, height: 90, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 32 },
  heroRight: { flex: 1, gap: 6 },
  docTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  docTypeBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  docSubtype: { fontSize: 12 },
  docTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  heroMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  langBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  langText: { fontSize: 11 },

  // Pages section
  pagesSection: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, padding: 16 },
  pagesRow: { gap: 10 },
  pageThumb: {
    width: 60, height: 80, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  pageThumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  pageNumber: {
    position: 'absolute', bottom: 4, right: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  pageNumberText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  // Confidence
  confRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 12,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  confLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 110 },
  confText: { fontSize: 12, fontWeight: '500' },
  confBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  confBarFill: { height: '100%', borderRadius: 3 },
  confPct: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },

  // Cards
  summaryCard: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, padding: 16 },
  summaryText: { fontSize: 14, lineHeight: 21 },
  outputCard: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, padding: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardSectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Formatted output
  foDocHeader: { fontSize: 18, fontWeight: '800', marginBottom: 6, marginTop: 4 },
  foSectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 10, marginBottom: 4 },
  foDivider: { height: 1, marginVertical: 10 },
  foFieldRow: { flexDirection: 'row', marginVertical: 3, gap: 8 },
  foFieldKey: { fontSize: 12, fontWeight: '600', width: 130, flexShrink: 0 },
  foFieldVal: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },
  foListRow: { flexDirection: 'row', gap: 8, marginVertical: 2 },
  foBullet: { fontSize: 13, marginTop: 1 },
  foListItem: { flex: 1, fontSize: 13, lineHeight: 19 },
  foMrz: { fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, padding: 8, borderRadius: 6, marginVertical: 4 },
  foBody: { fontSize: 13, lineHeight: 19, marginVertical: 1 },

  // Structured fields
  sfGrid: { gap: 2 },
  sfRow: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 0.5, gap: 10 },
  sfKey: { fontSize: 12, fontWeight: '600', width: 130, flexShrink: 0 },
  sfVal: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Entities
  entityRow: { marginBottom: 12 },
  entityLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  entityLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  entityChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  entityChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  entityChipText: { fontSize: 12, fontWeight: '500' },

  // Tags
  tagsSection: { marginTop: 12 },
  tagsRow: { paddingHorizontal: 20, gap: 8 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: '600' },

  // Bottom action bar
  bottomBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8,
    gap: 12, borderTopWidth: 0.5,
  },
  discardBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
  },
  discardBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
