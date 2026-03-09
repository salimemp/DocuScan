import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Image, Alert, ActivityIndicator, Modal,
  TextInput, Pressable, Platform, Share, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SignatureCanvas } from '../../components/SignatureCanvas';
import { ReadAloudControls, ReadAloudButton } from '../../components/ReadAloudControls';

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
  // Documents
  { id: 'pdf', label: 'PDF Document', icon: 'document-text', ext: '.pdf', mime: 'application/pdf', category: 'doc' },
  { id: 'docx', label: 'Word Document', icon: 'document', ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'doc' },
  { id: 'xlsx', label: 'Excel Spreadsheet', icon: 'grid', ext: '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'doc' },
  { id: 'pptx', label: 'PowerPoint', icon: 'easel', ext: '.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'doc' },
  { id: 'txt', label: 'Plain Text', icon: 'reader', ext: '.txt', mime: 'text/plain', category: 'doc' },
  { id: 'html', label: 'HTML Page', icon: 'code-slash', ext: '.html', mime: 'text/html', category: 'doc' },
  { id: 'json', label: 'JSON Data', icon: 'code', ext: '.json', mime: 'application/json', category: 'doc' },
  { id: 'md', label: 'Markdown', icon: 'logo-markdown', ext: '.md', mime: 'text/markdown', category: 'doc' },
  // Images
  { id: 'png', label: 'PNG Image', icon: 'image', ext: '.png', mime: 'image/png', category: 'img' },
  { id: 'jpeg', label: 'JPEG Image', icon: 'image-outline', ext: '.jpg', mime: 'image/jpeg', category: 'img' },
  { id: 'tiff', label: 'TIFF Image', icon: 'image', ext: '.tiff', mime: 'image/tiff', category: 'img' },
  { id: 'bmp', label: 'BMP Image', icon: 'image', ext: '.bmp', mime: 'image/bmp', category: 'img' },
  { id: 'webp', label: 'WebP Image', icon: 'image', ext: '.webp', mime: 'image/webp', category: 'img' },
  { id: 'svg', label: 'SVG Vector', icon: 'shapes', ext: '.svg', mime: 'image/svg+xml', category: 'img' },
  // E-books
  { id: 'epub', label: 'EPUB E-book', icon: 'book', ext: '.epub', mime: 'application/epub+zip', category: 'ebook' },
  { id: 'mobi', label: 'MOBI (Kindle)', icon: 'tablet-landscape', ext: '.mobi', mime: 'application/x-mobipocket-ebook', category: 'ebook' },
];

export default function DocumentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, shadows, isDark } = useTheme();
  const { t } = useLanguage();

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showSignatures, setShowSignatures] = useState(false);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [showRequestSignature, setShowRequestSignature] = useState(false);
  const [showRequestComment, setShowRequestComment] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Comment state
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  
  // Signature request state
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  
  // Saved signatures
  const [savedSignatures, setSavedSignatures] = useState<any[]>([]);

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

  const fetchSignatures = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/signatures`);
      if (res.ok) {
        const sigs = await res.json();
        setSavedSignatures(sigs);
      }
    } catch (e) {
      console.log('Failed to fetch signatures');
    }
  };

  useEffect(() => {
    fetchDocument();
    fetchSignatures();
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
      
      const filename = data.filename || `document${format.ext}`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, data.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

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

  // ── Comment Functions ────────────────────────────────────────────────────
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: commentAuthor.trim() || 'Anonymous',
          content: newComment.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to add comment');
      await fetchDocument();
      setNewComment('');
      Alert.alert('Success', 'Comment added!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAddingComment(false);
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/documents/${id}/comments/${commentId}/resolve`, {
        method: 'PUT',
      });
      await fetchDocument();
    } catch (e) {
      Alert.alert('Error', 'Failed to resolve comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/documents/${id}/comments/${commentId}`, {
        method: 'DELETE',
      });
      await fetchDocument();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete comment');
    }
  };

  // ── Signature Functions ────────────────────────────────────────────────────
  const handleSaveSignature = async (signatureData: { name: string; image_base64: string }) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signatureData),
      });
      if (!res.ok) throw new Error('Failed to save signature');
      await fetchSignatures();
      Alert.alert('Success', 'Signature saved!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleAddSignatureToDocument = async (signatureId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${id}/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_id: signatureId,
          page: 0,
          x: 50,
          y: 80,
          width: 25,
        }),
      });
      if (!res.ok) throw new Error('Failed to add signature');
      await fetchDocument();
      setShowSignatures(false);
      Alert.alert('Success', 'Signature added to document!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRequestSignature = async () => {
    if (!signerEmail.trim() || !signerName.trim()) {
      Alert.alert('Error', 'Please enter signer name and email');
      return;
    }
    setSendingRequest(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${id}/request-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_name: requesterName.trim() || 'DocScan User',
          requester_email: requesterEmail.trim() || 'user@docscan.app',
          signer_email: signerEmail.trim(),
          signer_name: signerName.trim(),
          message: requestMessage.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to send request');
      await fetchDocument();
      setShowRequestSignature(false);
      setSignerName('');
      setSignerEmail('');
      setRequestMessage('');
      Alert.alert('Success', `Signature request sent to ${signerEmail}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSendingRequest(false);
    }
  };

  const handleRequestComment = async () => {
    if (!signerEmail.trim() || !signerName.trim()) {
      Alert.alert('Error', 'Please enter reviewer name and email');
      return;
    }
    setSendingRequest(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${id}/request-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_name: requesterName.trim() || 'DocScan User',
          requester_email: requesterEmail.trim() || 'user@docscan.app',
          reviewer_email: signerEmail.trim(),
          reviewer_name: signerName.trim(),
          message: requestMessage.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to send request');
      setShowRequestComment(false);
      setSignerName('');
      setSignerEmail('');
      setRequestMessage('');
      Alert.alert('Success', `Comment request sent to ${signerEmail}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSendingRequest(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('loading')}</Text>
      </View>
    );
  }

  if (error || !doc) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error || t('documentNotFound')}</Text>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>{t('back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const meta = getMeta(doc.document_type);
  const confidencePct = Math.round((doc.confidence ?? 0) * 100);
  const comments = doc.comments || [];
  const signatures = doc.signatures || [];
  const signatureRequests = doc.signature_requests || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {t('documentDetails')}
        </Text>
        <TouchableOpacity testID="more-btn" onPress={handleDelete} style={styles.headerBtn}>
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

        {/* Primary Action Buttons */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            testID="edit-btn"
            style={[styles.actionBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
            onPress={handleEdit}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>{t('edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="export-btn"
            style={[styles.actionBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
            onPress={() => setShowExport(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#059669' + '18' }]}>
              <Ionicons name="download-outline" size={22} color="#059669" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>{t('export')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="share-btn"
            style={[styles.actionBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
            onPress={handleShare}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' + '18' }]}>
              <Ionicons name="share-social-outline" size={22} color="#8B5CF6" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>{t('share')}</Text>
          </TouchableOpacity>
        </View>

        {/* Secondary Action Buttons - Signatures & Comments */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            testID="signatures-btn"
            style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowSignatures(true)}
          >
            <Ionicons name="finger-print-outline" size={20} color="#2563EB" />
            <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
              Signatures ({signatures.length})
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="comments-btn"
            style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowComments(true)}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#059669" />
            <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
              Comments ({comments.length})
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Pending Signature Requests */}
        {signatureRequests.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Pending Signature Requests</Text>
            </View>
            {signatureRequests.map((req: any, i: number) => (
              <View key={i} style={[styles.requestRow, { borderBottomColor: colors.border }]}>
                <View style={styles.requestInfo}>
                  <Text style={[styles.requestName, { color: colors.textPrimary }]}>{req.signer_name}</Text>
                  <Text style={[styles.requestEmail, { color: colors.textSecondary }]}>{req.signer_email}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: req.status === 'signed' ? '#059669' : '#F59E0B' }]}>
                  <Text style={styles.statusBadgeText}>{req.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

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

        {/* Placed Signatures */}
        {signatures.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="finger-print" size={18} color="#2563EB" />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Document Signatures</Text>
            </View>
            {signatures.map((sig: any, i: number) => (
              <View key={i} style={[styles.signatureRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.sigPreview, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="finger-print" size={24} color="#2563EB" />
                </View>
                <View style={styles.sigInfo}>
                  <Text style={[styles.sigName, { color: colors.textPrimary }]}>{sig.signature_name}</Text>
                  <Text style={[styles.sigDate, { color: colors.textTertiary }]}>
                    Page {sig.page + 1} • Added {new Date(sig.placed_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
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

      {/* ════════════════════════════════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════════════════════════════ */}

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

      {/* Comments Modal */}
      <Modal visible={showComments} transparent animationType="slide" onRequestClose={() => setShowComments(false)}>
        <View style={[styles.fullModal, { backgroundColor: colors.background }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowComments(false)} style={styles.headerBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Comments</Text>
              <TouchableOpacity onPress={() => setShowRequestComment(true)} style={styles.headerBtn}>
                <Ionicons name="person-add-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              {/* Add Comment */}
              <View style={[styles.addCommentBox, { backgroundColor: colors.surface, ...shadows.sm }]}>
                <TextInput
                  style={[styles.commentAuthorInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
                  placeholder="Your name (optional)"
                  placeholderTextColor={colors.textTertiary}
                  value={commentAuthor}
                  onChangeText={setCommentAuthor}
                />
                <TextInput
                  style={[styles.commentInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
                  placeholder="Write a comment..."
                  placeholderTextColor={colors.textTertiary}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={[styles.addCommentBtn, { backgroundColor: colors.primary }]}
                  onPress={handleAddComment}
                  disabled={addingComment || !newComment.trim()}
                >
                  {addingComment ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFF" />
                      <Text style={styles.addCommentBtnText}>Add Comment</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Comments List */}
              {comments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No comments yet</Text>
                </View>
              ) : (
                comments.map((comment: any, i: number) => (
                  <View key={i} style={[styles.commentCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
                    <View style={styles.commentHeader}>
                      <View style={[styles.commentAvatar, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.commentAvatarText, { color: colors.primary }]}>
                          {comment.author?.charAt(0)?.toUpperCase() || 'A'}
                        </Text>
                      </View>
                      <View style={styles.commentMeta}>
                        <Text style={[styles.commentAuthor, { color: colors.textPrimary }]}>{comment.author}</Text>
                        <Text style={[styles.commentDate, { color: colors.textTertiary }]}>
                          {new Date(comment.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      {comment.resolved && (
                        <View style={[styles.resolvedBadge, { backgroundColor: '#059669' }]}>
                          <Text style={styles.resolvedBadgeText}>Resolved</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.commentContent, { color: colors.textPrimary }]}>{comment.content}</Text>
                    <View style={styles.commentActions}>
                      {!comment.resolved && (
                        <TouchableOpacity
                          style={styles.commentActionBtn}
                          onPress={() => handleResolveComment(comment.id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
                          <Text style={[styles.commentActionText, { color: '#059669' }]}>Resolve</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.commentActionBtn}
                        onPress={() => handleDeleteComment(comment.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                        <Text style={[styles.commentActionText, { color: colors.error }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Signatures Modal */}
      <Modal visible={showSignatures} transparent animationType="slide" onRequestClose={() => setShowSignatures(false)}>
        <View style={[styles.fullModal, { backgroundColor: colors.background }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowSignatures(false)} style={styles.headerBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Signatures</Text>
              <TouchableOpacity onPress={() => setShowRequestSignature(true)} style={styles.headerBtn}>
                <Ionicons name="mail-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              {/* Create New Signature */}
              <TouchableOpacity
                style={[styles.createSignatureBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowSignatureCanvas(true)}
              >
                <Ionicons name="create-outline" size={22} color="#FFF" />
                <Text style={styles.createSignatureBtnText}>Draw New Signature</Text>
              </TouchableOpacity>

              {/* Saved Signatures */}
              <Text style={[styles.sigSectionTitle, { color: colors.textSecondary }]}>Saved Signatures</Text>
              {savedSignatures.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="finger-print-outline" size={48} color={colors.textTertiary} />
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No saved signatures</Text>
                </View>
              ) : (
                savedSignatures.map((sig: any, i: number) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.savedSigCard, { backgroundColor: colors.surface, ...shadows.sm }]}
                    onPress={() => handleAddSignatureToDocument(sig.id)}
                  >
                    <View style={[styles.sigPreviewLarge, { backgroundColor: '#F8FAFC' }]}>
                      <Ionicons name="finger-print" size={32} color="#2563EB" />
                    </View>
                    <View style={styles.sigCardInfo}>
                      <Text style={[styles.sigCardName, { color: colors.textPrimary }]}>{sig.name}</Text>
                      <Text style={[styles.sigCardDate, { color: colors.textTertiary }]}>
                        Created {new Date(sig.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.addSigBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="add" size={18} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Signature Canvas */}
      <SignatureCanvas
        visible={showSignatureCanvas}
        onClose={() => setShowSignatureCanvas(false)}
        onSave={handleSaveSignature}
      />

      {/* Request Signature Modal */}
      <Modal visible={showRequestSignature} transparent animationType="fade" onRequestClose={() => setShowRequestSignature(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRequestSignature(false)}>
          <View style={[styles.requestModal, { backgroundColor: colors.surface, ...shadows.lg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Request Signature</Text>
            <Text style={[styles.requestSubtitle, { color: colors.textSecondary }]}>
              Send an email request for someone to sign this document
            </Text>
            <TextInput
              style={[styles.requestInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Your name"
              placeholderTextColor={colors.textTertiary}
              value={requesterName}
              onChangeText={setRequesterName}
            />
            <TextInput
              style={[styles.requestInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Your email"
              placeholderTextColor={colors.textTertiary}
              value={requesterEmail}
              onChangeText={setRequesterEmail}
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.requestInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Signer's name *"
              placeholderTextColor={colors.textTertiary}
              value={signerName}
              onChangeText={setSignerName}
            />
            <TextInput
              style={[styles.requestInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Signer's email *"
              placeholderTextColor={colors.textTertiary}
              value={signerEmail}
              onChangeText={setSignerEmail}
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.requestInput, styles.requestMessageInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Message (optional)"
              placeholderTextColor={colors.textTertiary}
              value={requestMessage}
              onChangeText={setRequestMessage}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowRequestSignature(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveModalBtn, { backgroundColor: colors.primary }]}
                onPress={handleRequestSignature}
                disabled={sendingRequest}
              >
                {sendingRequest ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Request Comment Modal */}
      <Modal visible={showRequestComment} transparent animationType="fade" onRequestClose={() => setShowRequestComment(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRequestComment(false)}>
          <View style={[styles.requestModal, { backgroundColor: colors.surface, ...shadows.lg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Request Comment</Text>
            <Text style={[styles.requestSubtitle, { color: colors.textSecondary }]}>
              Send an email request for someone to review this document
            </Text>
            <TextInput
              style={[styles.requestInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Your name"
              placeholderTextColor={colors.textTertiary}
              value={requesterName}
              onChangeText={setRequesterName}
            />
            <TextInput
              style={[styles.requestInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Your email"
              placeholderTextColor={colors.textTertiary}
              value={requesterEmail}
              onChangeText={setRequesterEmail}
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.requestInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Reviewer's name *"
              placeholderTextColor={colors.textTertiary}
              value={signerName}
              onChangeText={setSignerName}
            />
            <TextInput
              style={[styles.requestInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Reviewer's email *"
              placeholderTextColor={colors.textTertiary}
              value={signerEmail}
              onChangeText={setSignerEmail}
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.requestInput, styles.requestMessageInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Message (optional)"
              placeholderTextColor={colors.textTertiary}
              value={requestMessage}
              onChangeText={setRequestMessage}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowRequestComment(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveModalBtn, { backgroundColor: colors.primary }]}
                onPress={handleRequestComment}
                disabled={sendingRequest}
              >
                {sendingRequest ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
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

  secondaryActions: { marginTop: 16, gap: 10 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1,
  },
  secondaryBtnText: { flex: 1, fontSize: 15, fontWeight: '500' },

  section: { borderRadius: 16, padding: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryText: { fontSize: 14, lineHeight: 21 },
  contentText: { fontSize: 13, lineHeight: 20 },

  requestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5 },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 14, fontWeight: '600' },
  requestEmail: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  signatureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  sigPreview: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sigInfo: { flex: 1 },
  sigName: { fontSize: 14, fontWeight: '600' },
  sigDate: { fontSize: 12, marginTop: 2 },

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

  fullModal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  modalHeaderTitle: { fontSize: 17, fontWeight: '600' },

  addCommentBox: { borderRadius: 16, padding: 16, marginBottom: 20 },
  commentAuthorInput: { borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10 },
  commentInput: { borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
  addCommentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 10,
  },
  addCommentBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyStateText: { fontSize: 14 },

  commentCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 16, fontWeight: '700' },
  commentMeta: { flex: 1 },
  commentAuthor: { fontSize: 14, fontWeight: '600' },
  commentDate: { fontSize: 11, marginTop: 2 },
  resolvedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  resolvedBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  commentContent: { fontSize: 14, lineHeight: 20 },
  commentActions: { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.1)' },
  commentActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentActionText: { fontSize: 12, fontWeight: '600' },

  createSignatureBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 14, marginBottom: 24,
  },
  createSignatureBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  sigSectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  savedSigCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, marginBottom: 10 },
  sigPreviewLarge: { width: 60, height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sigCardInfo: { flex: 1 },
  sigCardName: { fontSize: 15, fontWeight: '600' },
  sigCardDate: { fontSize: 12, marginTop: 2 },
  addSigBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  requestModal: { width: '90%', borderRadius: 20, padding: 24 },
  requestSubtitle: { fontSize: 13, marginBottom: 16 },
  requestInput: { borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 12 },
  requestMessageInput: { minHeight: 80, textAlignVertical: 'top' },
});
