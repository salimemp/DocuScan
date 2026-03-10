import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal,
  TextInput, Alert, ActivityIndicator, RefreshControl, Image,
  StatusBar, Pressable, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

type EnclaveLevel = 0 | 1 | 2;
type TabType = 'all' | 'encrypted' | 'enclave';

const LEVEL_CONFIG = {
  0: { label: 'Normal', color: '#22C55E', icon: 'shield-outline' },
  1: { label: 'Sensitive', color: '#F59E0B', icon: 'shield-half-outline' },
  2: { label: 'Critical', color: '#EF4444', icon: 'shield-checkmark' },
};

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
  tax_document: { emoji: '📊', color: '#059669' },
  insurance_document: { emoji: '🛡️', color: '#0369A1' },
  legal_document: { emoji: '⚖️', color: '#374151' },
  general_document: { emoji: '📋', color: '#6B7280' },
};

const getMeta = (type: string) => DOC_META[type] ?? DOC_META.general_document;

export default function SecureEnclaveScreen() {
  const router = useRouter();
  const { colors, shadows, isDark } = useTheme();
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  
  // Modals
  const [showEncryptModal, setShowEncryptModal] = useState(false);
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [targetDocId, setTargetDocId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [moveToEnclave, setMoveToEnclave] = useState(false);
  const [enclaveLevel, setEnclaveLevel] = useState<EnclaveLevel>(1);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch stats
      const statsRes = await fetch(`${BACKEND_URL}/api/security/enclave-stats`);
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      
      // Fetch documents based on active tab
      let url = `${BACKEND_URL}/api/security/advanced-search?limit=100`;
      if (activeTab === 'encrypted') {
        url += '&is_encrypted=true';
      } else if (activeTab === 'enclave') {
        url += '&is_in_enclave=true';
      }
      
      const docsRes = await fetch(url);
      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  
  useEffect(() => {
    fetchData();
  }, [activeTab, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleSelection = (id: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEncrypt = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    setActionLoading(true);
    try {
      const docsToEncrypt = targetDocId ? [targetDocId] : Array.from(selectedDocs);
      
      for (const docId of docsToEncrypt) {
        const res = await fetch(`${BACKEND_URL}/api/security/encrypt-document`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: docId,
            password,
            move_to_enclave: moveToEnclave,
            enclave_level: enclaveLevel,
          }),
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Encryption failed');
        }
      }
      
      Alert.alert('Success', `${docsToEncrypt.length} document(s) encrypted successfully`);
      resetModals();
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Encryption failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecrypt = async () => {
    if (!password || !targetDocId) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/security/decrypt-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: targetDocId,
          password,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Decryption failed');
      }
      
      const data = await res.json();
      resetModals();
      // Navigate to document view with decrypted data
      router.push({ pathname: '/document/[id]', params: { id: targetDocId } });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Incorrect password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveEncryption = async () => {
    if (!password || !targetDocId) return;
    
    Alert.alert(
      'Remove Encryption',
      'This will permanently remove encryption from the document. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await fetch(`${BACKEND_URL}/api/security/remove-encryption`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document_id: targetDocId, password }),
              });
              
              if (!res.ok) throw new Error('Incorrect password');
              
              Alert.alert('Success', 'Encryption removed');
              resetModals();
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMoveToEnclave = async (docId: string, level: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/security/move-to-enclave/${docId}?level=${level}`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to move document');
      
      Alert.alert('Success', 'Document moved to secure enclave');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCategorize = async (docId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/security/categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: docId }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Categorization failed');
      }
      
      const data = await res.json();
      Alert.alert(
        'Categorization Complete',
        `Category: ${data.category}\nConfidence: ${Math.round(data.confidence * 100)}%\n\n${data.recommendation}`
      );
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const resetModals = () => {
    setShowEncryptModal(false);
    setShowDecryptModal(false);
    setTargetDocId(null);
    setPassword('');
    setConfirmPassword('');
    setMoveToEnclave(false);
    setEnclaveLevel(1);
    setSelectionMode(false);
    setSelectedDocs(new Set());
  };

  const renderDocItem = ({ item }: { item: any }) => {
    const meta = getMeta(item.document_type);
    const levelConfig = LEVEL_CONFIG[item.enclave_level as EnclaveLevel] || LEVEL_CONFIG[0];
    const isSelected = selectedDocs.has(item.id);
    
    return (
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => {
          if (selectionMode) {
            toggleSelection(item.id);
          } else if (item.is_encrypted) {
            setTargetDocId(item.id);
            setShowDecryptModal(true);
          } else {
            router.push({ pathname: '/document/[id]', params: { id: item.id } });
          }
        }}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            toggleSelection(item.id);
          }
        }}
        style={[
          styles.docCard,
          { backgroundColor: colors.surface, ...shadows.sm },
          isSelected && { borderWidth: 2, borderColor: colors.primary },
        ]}
      >
        {selectionMode && (
          <View style={[styles.checkbox, { backgroundColor: isSelected ? colors.primary : colors.surfaceHighlight }]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
        )}
        
        <View style={styles.thumbWrap}>
          {item.image_thumbnail && !item.is_encrypted ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${item.image_thumbnail}` }}
              style={styles.thumbImg}
            />
          ) : (
            <View style={[styles.thumbPlaceholder, { backgroundColor: meta.color + '18' }]}>
              {item.is_encrypted ? (
                <Ionicons name="lock-closed" size={24} color={meta.color} />
              ) : (
                <Text style={styles.thumbEmoji}>{meta.emoji}</Text>
              )}
            </View>
          )}
          
          {/* Status badges */}
          <View style={styles.badgeStack}>
            {item.is_encrypted && (
              <View style={[styles.statusBadge, { backgroundColor: '#EF4444' }]}>
                <Ionicons name="lock-closed" size={10} color="#FFF" />
              </View>
            )}
            {item.is_in_enclave && (
              <View style={[styles.statusBadge, { backgroundColor: levelConfig.color }]}>
                <Ionicons name={levelConfig.icon as any} size={10} color="#FFF" />
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.docInfo}>
          <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
          
          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: meta.color + '18' }]}>
              <Text style={[styles.typeBadgeText, { color: meta.color }]}>
                {meta.emoji} {item.document_type?.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            {item.is_encrypted && (
              <Text style={[styles.statusText, { color: '#EF4444' }]}>🔐 Encrypted</Text>
            )}
            {item.is_in_enclave && (
              <Text style={[styles.statusText, { color: levelConfig.color }]}>
                {levelConfig.label}
              </Text>
            )}
          </View>
        </View>
        
        {!selectionMode && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              if (item.is_encrypted) {
                setTargetDocId(item.id);
                setShowDecryptModal(true);
              } else {
                Alert.alert(
                  'Document Actions',
                  'Choose an action',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Encrypt',
                      onPress: () => {
                        setTargetDocId(item.id);
                        setShowEncryptModal(true);
                      }
                    },
                    {
                      text: 'AI Categorize',
                      onPress: () => handleCategorize(item.id)
                    },
                    ...(!item.is_in_enclave ? [{
                      text: 'Move to Enclave',
                      onPress: () => handleMoveToEnclave(item.id, 1)
                    }] : []),
                  ]
                );
              }
            }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'all', label: 'All Docs', icon: 'documents-outline' },
    { id: 'encrypted', label: 'Encrypted', icon: 'lock-closed-outline' },
    { id: 'enclave', label: 'Enclave', icon: 'shield-checkmark-outline' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            🔒 Secure Enclave
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Encrypted & Protected Documents
          </Text>
        </View>
        {selectionMode ? (
          <TouchableOpacity
            onPress={resetModals}
            style={[styles.iconBtn, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setSelectionMode(true)}
            style={[styles.iconBtn, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="checkbox-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Stats Banner */}
      {stats && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsRow}
          contentContainerStyle={styles.statsContent}
        >
          <View style={[styles.statCard, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="documents" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total_documents}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EF4444' + '18' }]}>
            <Ionicons name="lock-closed" size={20} color="#EF4444" />
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.encrypted_documents}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Encrypted</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#22C55E' + '18' }]}>
            <Ionicons name="shield-checkmark" size={20} color="#22C55E" />
            <Text style={[styles.statValue, { color: '#22C55E' }]}>{stats.enclave_documents}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Enclave</Text>
          </View>
        </ScrollView>
      )}
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tab,
              { backgroundColor: activeTab === tab.id ? colors.primary : colors.surface },
              shadows.sm,
            ]}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.id ? '#FFF' : colors.textSecondary}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.id ? '#FFF' : colors.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Selection Actions */}
      {selectionMode && selectedDocs.size > 0 && (
        <View style={[styles.selectionBar, { backgroundColor: colors.primary }]}>
          <Text style={styles.selectionText}>{selectedDocs.size} selected</Text>
          <TouchableOpacity
            style={styles.selectionAction}
            onPress={() => setShowEncryptModal(true)}
          >
            <Ionicons name="lock-closed" size={18} color="#FFF" />
            <Text style={styles.selectionActionText}>Encrypt All</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Document List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={item => item.id}
          renderItem={renderDocItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="shield-outline" size={64} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                No Documents Found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                {activeTab === 'encrypted'
                  ? 'No encrypted documents yet'
                  : activeTab === 'enclave'
                  ? 'No documents in secure enclave'
                  : 'Start by scanning some documents'}
              </Text>
            </View>
          }
        />
      )}
      
      {/* Encrypt Modal */}
      <Modal visible={showEncryptModal} transparent animationType="fade" onRequestClose={resetModals}>
        <Pressable style={styles.modalOverlay} onPress={resetModals}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface, ...shadows.lg }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="lock-closed" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Encrypt Document{selectedDocs.size > 1 ? 's' : ''}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                AES-256 encryption protects your document
              </Text>
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Confirm password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            
            <TouchableOpacity
              style={[styles.optionRow, { backgroundColor: colors.surfaceHighlight }]}
              onPress={() => setMoveToEnclave(!moveToEnclave)}
            >
              <Ionicons
                name={moveToEnclave ? 'checkbox' : 'square-outline'}
                size={22}
                color={moveToEnclave ? colors.primary : colors.textTertiary}
              />
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                Move to Secure Enclave
              </Text>
            </TouchableOpacity>
            
            {moveToEnclave && (
              <View style={styles.levelSelector}>
                <Text style={[styles.levelLabel, { color: colors.textSecondary }]}>
                  Security Level:
                </Text>
                <View style={styles.levelOptions}>
                  {([1, 2] as EnclaveLevel[]).map(level => {
                    const config = LEVEL_CONFIG[level];
                    return (
                      <TouchableOpacity
                        key={level}
                        onPress={() => setEnclaveLevel(level)}
                        style={[
                          styles.levelOption,
                          { borderColor: config.color },
                          enclaveLevel === level && { backgroundColor: config.color + '18' },
                        ]}
                      >
                        <Ionicons name={config.icon as any} size={16} color={config.color} />
                        <Text style={[styles.levelOptionText, { color: config.color }]}>
                          {config.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={resetModals}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleEncrypt}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Encrypt</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
      
      {/* Decrypt Modal */}
      <Modal visible={showDecryptModal} transparent animationType="fade" onRequestClose={resetModals}>
        <Pressable style={styles.modalOverlay} onPress={resetModals}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface, ...shadows.lg }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: '#EF4444' + '18' }]}>
                <Ionicons name="lock-open" size={32} color="#EF4444" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Unlock Document
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Enter password to view encrypted content
              </Text>
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Enter password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={resetModals}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleDecrypt}
                disabled={actionLoading || !password}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Unlock</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.removeEncryptionBtn}
              onPress={handleRemoveEncryption}
            >
              <Text style={styles.removeEncryptionText}>Remove Encryption Permanently</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  
  statsRow: { maxHeight: 90, marginVertical: 8 },
  statsContent: { paddingHorizontal: 16, gap: 10 },
  statCard: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, alignItems: 'center', gap: 4, minWidth: 100 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500' },
  
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  tabText: { fontSize: 13, fontWeight: '600' },
  
  selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, marginHorizontal: 16, borderRadius: 12, marginBottom: 8 },
  selectionText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  selectionAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectionActionText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  docCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  thumbWrap: { position: 'relative' },
  thumbImg: { width: 56, height: 70, borderRadius: 10 },
  thumbPlaceholder: { width: 56, height: 70, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 26 },
  badgeStack: { position: 'absolute', bottom: -4, right: -4, flexDirection: 'row', gap: 2 },
  statusBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docInfo: { flex: 1, marginLeft: 12 },
  docTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  actionBtn: { padding: 8 },
  
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 24, padding: 24 },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalIconWrap: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalSubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  input: { borderRadius: 14, padding: 16, fontSize: 16, borderWidth: 1, marginBottom: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 12 },
  optionText: { fontSize: 15, fontWeight: '500' },
  levelSelector: { marginBottom: 16 },
  levelLabel: { fontSize: 13, fontWeight: '500', marginBottom: 10 },
  levelOptions: { flexDirection: 'row', gap: 10 },
  levelOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
  levelOptionText: { fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 1.5, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  removeEncryptionBtn: { marginTop: 16, alignItems: 'center' },
  removeEncryptionText: { color: '#EF4444', fontSize: 13, fontWeight: '500' },
});
