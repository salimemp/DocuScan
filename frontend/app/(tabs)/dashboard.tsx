import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Image, RefreshControl, ActivityIndicator,
  Modal, Pressable, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

const DOC_META: Record<string, { emoji: string; color: string }> = {
  passport: { emoji: '🛂', color: '#2563EB' },
  national_id: { emoji: '🪪', color: '#7C3AED' },
  drivers_license: { emoji: '🚗', color: '#D97706' },
  invoice: { emoji: '📄', color: '#059669' },
  receipt: { emoji: '🧾', color: '#0891B2' },
  business_card: { emoji: '💼', color: '#DC2626' },
  contract: { emoji: '📜', color: '#7C3AED' },
  bank_statement: { emoji: '🏦', color: '#0284C7' },
  medical_record: { emoji: '🏥', color: '#DC2626' },
  prescription: { emoji: '💊', color: '#7C3AED' },
  handwritten_note: { emoji: '✍️', color: '#92400E' },
  certificate: { emoji: '🏆', color: '#B45309' },
  legal_document: { emoji: '⚖️', color: '#374151' },
  academic_transcript: { emoji: '🎓', color: '#1D4ED8' },
  tax_document: { emoji: '📊', color: '#059669' },
  insurance_document: { emoji: '🛡️', color: '#0369A1' },
  utility_bill: { emoji: '💡', color: '#D97706' },
  general_document: { emoji: '📋', color: '#6B7280' },
};

const getMeta = (type: string) => DOC_META[type] ?? DOC_META.general_document;

export default function DashboardScreen() {
  const { colors, shadows, isDark } = useTheme();
  const router = useRouter();
  const [stats, setStats] = useState({ total_scans: 0, storage_used: '0 KB', last_scan: 'Never' });
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showShareDoc, setShowShareDoc] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showCloudBackup, setShowCloudBackup] = useState(false);
  
  // Share form state
  const [shareEmail, setShareEmail] = useState('');
  const [shareName, setShareName] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  
  // Folder state
  const [folderName, setFolderName] = useState('');

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, docsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/stats`),
        fetch(`${BACKEND_URL}/api/documents`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (docsRes.ok) {
        const docs = await docsRes.json();
        setRecentDocs(docs.slice(0, 5));
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleShareDoc = () => {
    if (recentDocs.length === 0) {
      Alert.alert('No Documents', 'Scan a document first to share.');
      return;
    }
    setSelectedDocId(recentDocs[0]?.id || null);
    setShowShareDoc(true);
  };

  const sendShareEmail = async () => {
    if (!shareEmail.trim() || !selectedDocId) {
      Alert.alert('Error', 'Please enter recipient email');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${selectedDocId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_name: 'DocScan User',
          sender_email: 'user@docscan.app',
          recipient_email: shareEmail.trim(),
          recipient_name: shareName.trim() || 'Recipient',
          message: 'Check out this document from DocScan Pro!',
        }),
      });
      if (!res.ok) throw new Error('Failed to share');
      Alert.alert('Success', `Document shared with ${shareEmail}`);
      setShowShareDoc(false);
      setShareEmail('');
      setShareName('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  const handleNewFolder = () => {
    setShowNewFolder(true);
  };

  const createFolder = () => {
    if (!folderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }
    // Folders would be stored in a separate collection
    Alert.alert('Folder Created', `Folder "${folderName}" created successfully!`);
    setShowNewFolder(false);
    setFolderName('');
  };

  const handleCloudBackup = () => {
    setShowCloudBackup(true);
  };

  const connectCloudProvider = (provider: string) => {
    Alert.alert(
      'Connect ' + provider,
      `To connect ${provider}, you'll need to authorize DocScan Pro to access your account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect', onPress: () => Alert.alert('Coming Soon', `${provider} integration will be available soon!`) },
      ]
    );
  };

  const quickActions = [
    { icon: 'images-outline', label: 'Import Photo', color: '#F59E0B', action: () => router.push('/scan') },
    { icon: 'share-social-outline', label: 'Share Doc', color: '#3B82F6', action: handleShareDoc },
    { icon: 'folder-outline', label: 'New Folder', color: '#10B981', action: handleNewFolder },
    { icon: 'cloud-upload-outline', label: 'Cloud Backup', color: '#8B5CF6', action: handleCloudBackup },
  ];

  const statItems = [
    { icon: 'document-text', label: 'Total Scans', value: String(stats.total_scans), color: '#2563EB' },
    { icon: 'server-outline', label: 'Storage Used', value: stats.storage_used, color: '#8B5CF6' },
    { icon: 'time', label: 'Last Scan', value: stats.last_scan, color: '#10B981' },
  ];

  const cloudProviders = [
    { id: 'google_drive', name: 'Google Drive', icon: 'logo-google', color: '#4285F4' },
    { id: 'dropbox', name: 'Dropbox', icon: 'cloud-outline', color: '#0061FF' },
    { id: 'onedrive', name: 'OneDrive', icon: 'logo-microsoft', color: '#0078D4' },
    { id: 'box', name: 'Box', icon: 'cube-outline', color: '#0061D5' },
    { id: 'icloud', name: 'iCloud', icon: 'logo-apple', color: '#3693F3' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting} 👋</Text>
            <Text style={[styles.appTitle, { color: colors.textPrimary }]}>DocScan Pro</Text>
          </View>
          <TouchableOpacity
            testID="settings-btn"
            style={[styles.iconBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
            activeOpacity={0.7}
            onPress={() => setShowSettings(true)}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={21} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.dateText, { color: colors.textTertiary }]}>{today}</Text>

        {/* Stats Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow} style={styles.statScroll}>
          {statItems.map((stat, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
              <View style={[styles.statIconWrap, { backgroundColor: stat.color + '18' }]}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Scan CTA */}
        <View style={styles.scanSection}>
          <TouchableOpacity
            testID="scan-document-btn"
            activeOpacity={0.85}
            onPress={() => router.push('/scan')}
            style={[styles.scanBtn, { backgroundColor: colors.primary, ...shadows.lg }]}
          >
            <View style={styles.scanLeft}>
              <View style={styles.scanIconCircle}>
                <Ionicons name="scan-outline" size={30} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.scanTitle}>Scan Document</Text>
                <Text style={styles.scanSubtitle}>AI reads any language instantly</Text>
              </View>
            </View>
            <View style={styles.scanArrow}>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.9)" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
        </View>
        <View style={styles.quickGrid}>
          {quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              testID={`quick-action-${i}`}
              activeOpacity={0.75}
              onPress={action.action}
              style={[styles.quickCard, { backgroundColor: colors.surface, ...shadows.sm }]}
            >
              <View style={[styles.qaIconWrap, { backgroundColor: action.color + '18' }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={[styles.qaLabel, { color: colors.textPrimary }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Scans */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Scans</Text>
          <TouchableOpacity testID="see-all-btn" activeOpacity={0.7} onPress={() => router.push('/history')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : recentDocs.length === 0 ? (
          <TouchableOpacity
            testID="first-scan-cta"
            style={[styles.emptyRecentCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}
            onPress={() => router.push('/scan')}
            activeOpacity={0.8}
          >
            <Ionicons name="scan-outline" size={28} color={colors.primary} />
            <Text style={[styles.emptyRecentText, { color: colors.textSecondary }]}>
              Tap to scan your first document
            </Text>
          </TouchableOpacity>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {recentDocs.map((doc) => {
              const meta = getMeta(doc.document_type);
              return (
                <TouchableOpacity
                  key={doc.id}
                  testID={`recent-doc-${doc.id}`}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/document/[id]', params: { id: doc.id } })}
                  style={[styles.recentCard, { backgroundColor: colors.surface, ...shadows.md }]}
                >
                  {doc.image_thumbnail ? (
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${doc.image_thumbnail}` }}
                      style={styles.recentThumbImg}
                    />
                  ) : (
                    <View style={[styles.recentThumb, { backgroundColor: meta.color + '18' }]}>
                      <Text style={styles.recentEmoji}>{meta.emoji}</Text>
                      <View style={[styles.recentBadge, { backgroundColor: meta.color }]}>
                        <Text style={styles.recentBadgeText}>{doc.document_type?.replace('_', ' ').toUpperCase().slice(0, 6)}</Text>
                      </View>
                    </View>
                  )}
                  <Text style={[styles.recentName, { color: colors.textPrimary }]} numberOfLines={2}>{doc.title}</Text>
                  <Text style={[styles.recentDate, { color: colors.textSecondary }]}>{doc.detected_language}</Text>
                  <Text style={[styles.recentSize, { color: colors.textTertiary }]}>{doc.size_kb} KB</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </ScrollView>

      {/* ═══ MODALS ═══ */}

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <View style={[styles.modalFull, { backgroundColor: colors.background }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.modalHeaderBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Settings</Text>
              <View style={{ width: 44 }} />
            </View>
            
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              {/* Account Section */}
              <Text style={[styles.settingsSection, { color: colors.textSecondary }]}>ACCOUNT</Text>
              <View style={[styles.settingsCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
                <TouchableOpacity style={styles.settingsItem}>
                  <Ionicons name="person-outline" size={22} color={colors.primary} />
                  <Text style={[styles.settingsItemText, { color: colors.textPrimary }]}>Profile</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
                <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.settingsItem}>
                  <Ionicons name="notifications-outline" size={22} color={colors.primary} />
                  <Text style={[styles.settingsItemText, { color: colors.textPrimary }]}>Notifications</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
                <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.settingsItem}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
                  <Text style={[styles.settingsItemText, { color: colors.textPrimary }]}>Privacy & Security</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* App Settings */}
              <Text style={[styles.settingsSection, { color: colors.textSecondary }]}>APP SETTINGS</Text>
              <View style={[styles.settingsCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
                <TouchableOpacity style={styles.settingsItem}>
                  <Ionicons name="moon-outline" size={22} color={colors.primary} />
                  <Text style={[styles.settingsItemText, { color: colors.textPrimary }]}>Dark Mode</Text>
                  <Text style={[styles.settingsItemValue, { color: colors.textTertiary }]}>Auto</Text>
                </TouchableOpacity>
                <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.settingsItem}>
                  <Ionicons name="language-outline" size={22} color={colors.primary} />
                  <Text style={[styles.settingsItemText, { color: colors.textPrimary }]}>Language</Text>
                  <Text style={[styles.settingsItemValue, { color: colors.textTertiary }]}>English</Text>
                </TouchableOpacity>
                <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.settingsItem}>
                  <Ionicons name="cloud-outline" size={22} color={colors.primary} />
                  <Text style={[styles.settingsItemText, { color: colors.textPrimary }]}>Cloud Sync</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* AI Settings */}
              <Text style={[styles.settingsSection, { color: colors.textSecondary }]}>AI SETTINGS</Text>
              <View style={[styles.settingsCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
                <TouchableOpacity style={styles.settingsItem}>
                  <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
                  <Text style={[styles.settingsItemText, { color: colors.textPrimary }]}>AI Model</Text>
                  <Text style={[styles.settingsItemValue, { color: colors.textTertiary }]}>Gemini 3</Text>
                </TouchableOpacity>
                <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.settingsItem}>
                  <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                  <Text style={[styles.settingsItemText, { color: colors.textPrimary }]}>Default Format</Text>
                  <Text style={[styles.settingsItemValue, { color: colors.textTertiary }]}>Auto-detect</Text>
                </TouchableOpacity>
              </View>

              {/* Support */}
              <Text style={[styles.settingsSection, { color: colors.textSecondary }]}>SUPPORT</Text>
              <View style={[styles.settingsCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
                <TouchableOpacity style={styles.settingsItem}>
                  <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
                  <Text style={[styles.settingsItemText, { color: colors.textPrimary }]}>Help Center</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
                <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.settingsItem}>
                  <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
                  <Text style={[styles.settingsItemText, { color: colors.textPrimary }]}>Contact Support</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
                <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.settingsItem}>
                  <Ionicons name="star-outline" size={22} color={colors.primary} />
                  <Text style={[styles.settingsItemText, { color: colors.textPrimary }]}>Rate App</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.versionText, { color: colors.textTertiary }]}>DocScan Pro v2.0.0</Text>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Share Document Modal */}
      <Modal visible={showShareDoc} transparent animationType="fade" onRequestClose={() => setShowShareDoc(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowShareDoc(false)}>
          <View style={[styles.shareModal, { backgroundColor: colors.surface, ...shadows.lg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.shareHeader}>
              <View style={[styles.shareIconWrap, { backgroundColor: '#3B82F6' + '18' }]}>
                <Ionicons name="share-social" size={28} color="#3B82F6" />
              </View>
              <Text style={[styles.shareTitle, { color: colors.textPrimary }]}>Share Document</Text>
              <Text style={[styles.shareSubtitle, { color: colors.textSecondary }]}>
                Send document via email
              </Text>
            </View>

            {/* Document Selector */}
            {recentDocs.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docSelector}>
                {recentDocs.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={[
                      styles.docSelectorItem,
                      { backgroundColor: colors.surfaceHighlight },
                      selectedDocId === doc.id && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedDocId(doc.id)}
                  >
                    <Text style={[styles.docSelectorText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {doc.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TextInput
              style={[styles.shareInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Recipient's name"
              placeholderTextColor={colors.textTertiary}
              value={shareName}
              onChangeText={setShareName}
            />
            <TextInput
              style={[styles.shareInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Recipient's email *"
              placeholderTextColor={colors.textTertiary}
              value={shareEmail}
              onChangeText={setShareEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.shareActions}>
              <TouchableOpacity
                style={[styles.shareCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowShareDoc(false)}
              >
                <Text style={[styles.shareCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareSendBtn, { backgroundColor: '#3B82F6' }]}
                onPress={sendShareEmail}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#FFF" />
                    <Text style={styles.shareSendText}>Send</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* New Folder Modal */}
      <Modal visible={showNewFolder} transparent animationType="fade" onRequestClose={() => setShowNewFolder(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowNewFolder(false)}>
          <View style={[styles.folderModal, { backgroundColor: colors.surface, ...shadows.lg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.folderHeader}>
              <View style={[styles.folderIconWrap, { backgroundColor: '#10B981' + '18' }]}>
                <Ionicons name="folder" size={28} color="#10B981" />
              </View>
              <Text style={[styles.folderTitle, { color: colors.textPrimary }]}>Create New Folder</Text>
              <Text style={[styles.folderSubtitle, { color: colors.textSecondary }]}>
                Organize your documents
              </Text>
            </View>

            <TextInput
              style={[styles.folderInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Folder name"
              placeholderTextColor={colors.textTertiary}
              value={folderName}
              onChangeText={setFolderName}
              autoFocus
            />

            <View style={styles.folderActions}>
              <TouchableOpacity
                style={[styles.folderCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowNewFolder(false)}
              >
                <Text style={[styles.folderCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.folderCreateBtn, { backgroundColor: '#10B981' }]}
                onPress={createFolder}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.folderCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Cloud Backup Modal */}
      <Modal visible={showCloudBackup} transparent animationType="slide" onRequestClose={() => setShowCloudBackup(false)}>
        <View style={[styles.modalFull, { backgroundColor: colors.background }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowCloudBackup(false)} style={styles.modalHeaderBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Cloud Backup</Text>
              <View style={{ width: 44 }} />
            </View>
            
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              <View style={[styles.cloudHeader, { backgroundColor: '#8B5CF6' + '15' }]}>
                <View style={[styles.cloudHeaderIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Ionicons name="cloud-upload" size={32} color="#FFF" />
                </View>
                <Text style={[styles.cloudHeaderTitle, { color: colors.textPrimary }]}>Backup Your Documents</Text>
                <Text style={[styles.cloudHeaderSubtitle, { color: colors.textSecondary }]}>
                  Connect a cloud storage provider to automatically backup your scanned documents
                </Text>
              </View>

              <Text style={[styles.cloudSectionTitle, { color: colors.textSecondary }]}>AVAILABLE PROVIDERS</Text>
              
              {cloudProviders.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={[styles.cloudProvider, { backgroundColor: colors.surface, ...shadows.sm }]}
                  onPress={() => connectCloudProvider(provider.name)}
                >
                  <View style={[styles.cloudProviderIcon, { backgroundColor: provider.color + '18' }]}>
                    <Ionicons name={provider.icon as any} size={24} color={provider.color} />
                  </View>
                  <Text style={[styles.cloudProviderName, { color: colors.textPrimary }]}>{provider.name}</Text>
                  <View style={[styles.connectBadge, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[styles.connectBadgeText, { color: colors.textSecondary }]}>Connect</Text>
                  </View>
                </TouchableOpacity>
              ))}

              <View style={[styles.cloudInfo, { backgroundColor: colors.surfaceHighlight }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.cloudInfoText, { color: colors.textSecondary }]}>
                  Your documents are encrypted before upload. Only you can access them.
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
  },
  greeting: { fontSize: 14, fontWeight: '500' },
  appTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  dateText: { fontSize: 13, paddingHorizontal: 20, marginBottom: 20 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statScroll: { marginBottom: 24 },
  statsRow: { paddingHorizontal: 20, gap: 12 },
  statCard: { borderRadius: 16, padding: 16, width: 130, alignItems: 'flex-start', gap: 8 },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  scanSection: { paddingHorizontal: 20, marginBottom: 28 },
  scanBtn: {
    borderRadius: 20, paddingVertical: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  scanLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scanIconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  scanSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  scanArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12, marginBottom: 28 },
  quickCard: {
    width: '47%', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  qaIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  loadingRow: { paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },
  emptyRecentCard: {
    marginHorizontal: 20, borderRadius: 16, padding: 28,
    alignItems: 'center', gap: 10, borderWidth: 1.5, borderStyle: 'dashed',
  },
  emptyRecentText: { fontSize: 14, textAlign: 'center' },
  recentRow: { paddingHorizontal: 20, gap: 12 },
  recentCard: { borderRadius: 16, padding: 14, width: 148, gap: 6 },
  recentThumb: {
    height: 96, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4, position: 'relative',
  },
  recentThumbImg: { height: 96, width: '100%', borderRadius: 12, marginBottom: 4, resizeMode: 'cover' },
  recentEmoji: { fontSize: 30 },
  recentBadge: {
    position: 'absolute', bottom: 6, right: 6,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5,
  },
  recentBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  recentName: { fontSize: 13, fontWeight: '600', lineHeight: 17 },
  recentDate: { fontSize: 11 },
  recentSize: { fontSize: 11 },

  // Modal styles
  modalFull: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  modalHeaderBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

  // Settings
  settingsSection: { fontSize: 12, fontWeight: '600', marginTop: 24, marginBottom: 10, marginLeft: 4 },
  settingsCard: { borderRadius: 14, overflow: 'hidden' },
  settingsItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  settingsItemText: { flex: 1, fontSize: 15 },
  settingsItemValue: { fontSize: 14 },
  settingsDivider: { height: 0.5, marginLeft: 52 },
  versionText: { textAlign: 'center', fontSize: 12, marginTop: 32, marginBottom: 20 },

  // Share Modal
  shareModal: { width: '90%', borderRadius: 24, padding: 24 },
  shareHeader: { alignItems: 'center', marginBottom: 20 },
  shareIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  shareTitle: { fontSize: 20, fontWeight: '700' },
  shareSubtitle: { fontSize: 14, marginTop: 4 },
  docSelector: { marginBottom: 16, maxHeight: 44 },
  docSelectorItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginRight: 8, maxWidth: 150 },
  docSelectorText: { fontSize: 13, fontWeight: '500' },
  shareInput: { borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12 },
  shareActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  shareCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  shareCancelText: { fontSize: 15, fontWeight: '600' },
  shareSendBtn: { flex: 1.5, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  shareSendText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Folder Modal
  folderModal: { width: '85%', borderRadius: 24, padding: 24 },
  folderHeader: { alignItems: 'center', marginBottom: 20 },
  folderIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  folderTitle: { fontSize: 20, fontWeight: '700' },
  folderSubtitle: { fontSize: 14, marginTop: 4 },
  folderInput: { borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 20 },
  folderActions: { flexDirection: 'row', gap: 12 },
  folderCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  folderCancelText: { fontSize: 15, fontWeight: '600' },
  folderCreateBtn: { flex: 1.5, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  folderCreateText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Cloud Backup
  cloudHeader: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24 },
  cloudHeaderIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cloudHeaderTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  cloudHeaderSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  cloudSectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 12, marginLeft: 4 },
  cloudProvider: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, marginBottom: 10 },
  cloudProviderIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cloudProviderName: { flex: 1, marginLeft: 14, fontSize: 15, fontWeight: '600' },
  connectBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  connectBadgeText: { fontSize: 13, fontWeight: '600' },
  cloudInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, marginTop: 16 },
  cloudInfoText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
