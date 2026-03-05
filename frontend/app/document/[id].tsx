import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Image, Alert, ActivityIndicator, Modal,
  TextInput, Pressable, Platform, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

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

const getMeta = (type: string) => DOC_META[type] ?? DOC_META.general_document;

const EXPORT_FORMATS = [
  { id: 'pdf', label: 'PDF Document', icon: 'document-text', ext: '.pdf', mime: 'application/pdf' },
  { id: 'docx', label: 'Word Document', icon: 'document', ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { id: 'txt', label: 'Plain Text', icon: 'reader', ext: '.txt', mime: 'text/plain' },
  { id: 'png', label: 'PNG Image', icon: 'image', ext: '.png', mime: 'image/png' },
  { id: 'jpeg', label: 'JPEG Image', icon: 'image-outline', ext: '.jpg', mime: 'image/jpeg' },
];

export default function DocumentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, shadows, isDark } = useTheme();

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchDocument = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${id}`);
      if (!res.ok) throw new Error('Document not found');
      const data = await res.json();
      setDoc(data);
      setNewTitle(data.title || '');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleRename = async () => {
    if (!newTitle.trim() || newTitle === doc?.title) {
      setShowRename(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to rename');
      const updated = await res.json();
      setDoc(updated);
      setShowRename(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to permanently delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/documents/${id}`, { method: 'DELETE' });
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const handleExport = async (format: typeof EXPORT_FORMATS[0]) => {
    setExporting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${id}/export?format=${format.id}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();
      
      // Save to file system
      const filename = data.filename || `document${format.ext}`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, data.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: format.mime,
          dialogTitle: `Share ${doc?.title || 'Document'}`,
        });
      } else {
        Alert.alert('Success', `Document exported as ${filename}`);
      }
      setShowExport(false);
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareContent = {
        title: doc?.title || 'Document',
        message: `${doc?.title || 'Document'}\n\n${doc?.summary || ''}\n\n${doc?.formatted_output || doc?.raw_text || ''}`,
      };
      await Share.share(shareContent);
    } catch (e: any) {
      Alert.alert('Share Failed', e.message);
    }
  };

  const handleEdit = () => {
    router.push({ pathname: '/editor', params: { id } });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading document...</Text>
      </View>
    );
  }

  if (error || !doc) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error || 'Document not found'}</Text>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const meta = getMeta(doc.document_type);
  const confidencePct = Math.round((doc.confidence ?? 0) * 100);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          testID="back-btn"
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          Document Details
        </Text>
        <TouchableOpacity
          testID="more-btn"
          onPress={handleDelete}
          style={styles.headerBtn}
        >
          <Ionicons name="trash-outline" size={22} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Document Preview Card */}
        <View style={[styles.previewCard, { backgroundColor: colors.surface, ...shadows.md }]}>
          {doc.image_thumbnail ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${doc.image_thumbnail}` }}
              style={styles.previewImage}
            />
          ) : (
            <View style={[styles.previewPlaceholder, { backgroundColor: meta.color + '18' }]}>
              <Text style={styles.previewEmoji}>{meta.emoji}</Text>
            </View>
          )}
          <View style={styles.previewInfo}>
            <View style={[styles.typeBadge, { backgroundColor: meta.color }]}>
              <Text style={styles.typeBadgeText}>{meta.emoji} {meta.label}</Text>
            </View>
            <TouchableOpacity
              testID="rename-btn"
              onPress={() => { setNewTitle(doc.title); setShowRename(true); }}
              style={styles.titleRow}
            >
              <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {doc.title}
              </Text>
              <Ionicons name="pencil-outline" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="language-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {doc.detected_language || 'Unknown'}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="document-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {doc.pages_count || 1} page{(doc.pages_count || 1) > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={[styles.confBar, { backgroundColor: colors.surfaceHighlight }]}>
              <View style={[styles.confFill, { width: `${confidencePct}%`, backgroundColor: colors.success }]} />
            </View>
            <Text style={[styles.confText, { color: colors.textTertiary }]}>
              AI Confidence: {confidencePct}%
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            testID="edit-btn"
            style={[styles.actionBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
            onPress={handleEdit}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="export-btn"
            style={[styles.actionBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
            onPress={() => setShowExport(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#059669' + '18' }]}>
              <Ionicons name="download-outline" size={22} color="#059669" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="share-btn"
            style={[styles.actionBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
            onPress={handleShare}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' + '18' }]}>
              <Ionicons name="share-social-outline" size={22} color="#8B5CF6" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        {doc.summary && (
          <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Summary</Text>
            </View>
            <Text style={[styles.summaryText, { color: colors.textPrimary }]}>{doc.summary}</Text>
          </View>
        )}

        {/* Formatted Output */}
        {doc.formatted_output && (
          <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Extracted Content</Text>
            </View>
            <Text style={[styles.contentText, { color: colors.textPrimary }]} selectable>
              {doc.formatted_output}
            </Text>
          </View>
        )}

        {/* Tags */}
        {doc.tags?.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetags-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tags</Text>
            </View>
            <View style={styles.tagsWrap}>
              {doc.tags.map((tag: string, i: number) => (
                <View key={i} style={[styles.tagChip, { backgroundColor: meta.color + '15', borderColor: meta.color + '30' }]}>
                  <Text style={[styles.tagText, { color: meta.color }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Rename Modal */}
      <Modal visible={showRename} transparent animationType="fade" onRequestClose={() => setShowRename(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRename(false)}>
          <View style={[styles.renameModal, { backgroundColor: colors.surface, ...shadows.lg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Rename Document</Text>
            <TextInput
              testID="rename-input"
              style={[styles.renameInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary, borderColor: colors.border }]}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Enter document title"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowRename(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveModalBtn, { backgroundColor: colors.primary }]}
                onPress={handleRename}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Export Modal */}
      <Modal visible={showExport} transparent animationType="slide" onRequestClose={() => setShowExport(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowExport(false)}>
          <View style={[styles.exportModal, { backgroundColor: colors.surface, ...shadows.lg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.exportHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Export Document</Text>
              <TouchableOpacity onPress={() => setShowExport(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.exportSubtitle, { color: colors.textSecondary }]}>
              Choose a format to export your document
            </Text>
            {EXPORT_FORMATS.map((format) => (
              <TouchableOpacity
                key={format.id}
                testID={`export-${format.id}`}
                style={[styles.exportOption, { borderColor: colors.border }]}
                onPress={() => handleExport(format)}
                disabled={exporting}
              >
                <View style={[styles.exportIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name={format.icon as any} size={22} color={colors.primary} />
                </View>
                <View style={styles.exportInfo}>
                  <Text style={[styles.exportLabel, { color: colors.textPrimary }]}>{format.label}</Text>
                  <Text style={[styles.exportExt, { color: colors.textTertiary }]}>{format.ext}</Text>
                </View>
                {exporting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  errorText: { fontSize: 16, textAlign: 'center' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  backBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },

  scrollContent: { padding: 20 },

  previewCard: { borderRadius: 20, padding: 16, flexDirection: 'row', gap: 16 },
  previewImage: { width: 100, height: 130, borderRadius: 12, resizeMode: 'cover' },
  previewPlaceholder: { width: 100, height: 130, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewEmoji: { fontSize: 40 },
  previewInfo: { flex: 1, gap: 8 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docTitle: { fontSize: 16, fontWeight: '700', flex: 1, lineHeight: 22 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  confBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 8 },
  confFill: { height: '100%', borderRadius: 2 },
  confText: { fontSize: 11, marginTop: 4 },

  actionGrid: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '600' },

  section: { borderRadius: 16, padding: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryText: { fontSize: 14, lineHeight: 21 },
  contentText: { fontSize: 13, lineHeight: 20 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  renameModal: { width: '85%', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  renameInput: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { borderWidth: 1.5 },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveModalBtn: {},
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  exportModal: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  exportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  exportSubtitle: { fontSize: 13, marginBottom: 20 },
  exportOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5 },
  exportIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exportInfo: { flex: 1 },
  exportLabel: { fontSize: 15, fontWeight: '600' },
  exportExt: { fontSize: 12, marginTop: 2 },
});
