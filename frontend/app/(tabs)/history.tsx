import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  StatusBar, ScrollView, Modal, Pressable, Alert,
  RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useFocusEffect, useRouter } from 'expo-router';
import { useLanguage } from '../../hooks/useLanguage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

type FilterType = 'All' | 'passport' | 'invoice' | 'receipt' | 'business_card' | 'contract' | 'handwritten_note' | 'general_document' | 'locked';
type SortType = 'Latest' | 'Oldest' | 'A–Z' | 'Z–A';

const FILTERS = [
  { id: 'All', label: 'All' },
  { id: 'locked', label: '🔒 Locked' },
  { id: 'passport', label: '🛂 Passport' },
  { id: 'invoice', label: '📄 Invoice' },
  { id: 'receipt', label: '🧾 Receipt' },
  { id: 'business_card', label: '💼 Business' },
  { id: 'contract', label: '📜 Contract' },
  { id: 'handwritten_note', label: '✍️ Notes' },
  { id: 'general_document', label: '📋 General' },
];

const SORT_OPTIONS: SortType[] = ['Latest', 'Oldest', 'A–Z', 'Z–A'];

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

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
};

export default function HistoryScreen() {
  const { colors, shadows, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [sortBy, setSortBy] = useState<SortType>('Latest');
  const [isGrid, setIsGrid] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Selection mode for bulk actions
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  
  // Password modals
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockDocId, setUnlockDocId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents`);
      if (res.ok) setDocs(await res.json());
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchDocs(); }, [fetchDocs]));

  const onRefresh = () => { setRefreshing(true); fetchDocs(); };

  const deleteDoc = async (id: string) => {
    Alert.alert('Delete Document', 'Are you sure you want to delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${BACKEND_URL}/api/documents/${id}`, { method: 'DELETE' });
            setDocs(prev => prev.filter(d => d.id !== id));
          } catch { Alert.alert('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  const toggleSelection = (id: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSetPassword = async () => {
    if (!password || password.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    setPasswordLoading(true);
    try {
      const docsToLock = Array.from(selectedDocs);
      for (const docId of docsToLock) {
        await fetch(`${BACKEND_URL}/api/documents/${docId}/password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
      }
      await fetchDocs();
      setShowSetPassword(false);
      setSelectionMode(false);
      setSelectedDocs(new Set());
      setPassword('');
      setConfirmPassword('');
      Alert.alert('Success', `${docsToLock.length} document(s) are now password protected`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to set password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUnlockDocument = async () => {
    if (!password || !unlockDocId) return;
    
    setPasswordLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${unlockDocId}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Incorrect password');
      }
      
      setShowUnlockPassword(false);
      setPassword('');
      // Navigate to document
      router.push({ pathname: '/document/[id]', params: { id: unlockDocId } });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Incorrect password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRemovePassword = async (docId: string) => {
    Alert.prompt(
      'Remove Password',
      'Enter the current password to remove protection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: async (pwd) => {
            if (!pwd) return;
            try {
              const res = await fetch(`${BACKEND_URL}/api/documents/${docId}/password`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd }),
              });
              if (!res.ok) throw new Error('Incorrect password');
              await fetchDocs();
              Alert.alert('Success', 'Password protection removed');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to remove password');
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const handleDocPress = (item: any) => {
    if (selectionMode) {
      toggleSelection(item.id);
      return;
    }
    
    if (item.is_locked) {
      setUnlockDocId(item.id);
      setShowUnlockPassword(true);
    } else {
      router.push({ pathname: '/document/[id]', params: { id: item.id } });
    }
  };

  const filtered = useMemo(() => {
    let list = [...docs];
    if (activeFilter === 'locked') {
      list = list.filter(d => d.is_locked);
    } else if (activeFilter !== 'All') {
      list = list.filter(d => d.document_type === activeFilter);
    }
    if (search.trim()) list = list.filter(d => d.title?.toLowerCase().includes(search.toLowerCase()) || d.summary?.toLowerCase().includes(search.toLowerCase()));
    if (sortBy === 'A–Z') list.sort((a, b) => a.title?.localeCompare(b.title));
    else if (sortBy === 'Z–A') list.sort((a, b) => b.title?.localeCompare(a.title));
    else if (sortBy === 'Oldest') list.reverse();
    return list;
  }, [docs, activeFilter, search, sortBy]);

  const lockedCount = docs.filter(d => d.is_locked).length;

  const renderItem = ({ item }: { item: any }) => {
    const meta = getMeta(item.document_type);
    const isSelected = selectedDocs.has(item.id);
    
    if (isGrid) {
      return (
        <TouchableOpacity
          testID={`history-doc-${item.id}`}
          activeOpacity={0.78}
          onPress={() => handleDocPress(item)}
          onLongPress={() => { setSelectionMode(true); toggleSelection(item.id); }}
          style={[
            styles.gridCard,
            { backgroundColor: colors.surface, ...shadows.sm },
            isSelected && { borderWidth: 2, borderColor: colors.primary },
          ]}
        >
          {selectionMode && (
            <View style={[styles.checkbox, { backgroundColor: isSelected ? colors.primary : colors.surfaceHighlight }]}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
          )}
          {item.is_locked && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={14} color="#FFF" />
            </View>
          )}
          {item.image_thumbnail ? (
            <Image source={{ uri: `data:image/jpeg;base64,${item.image_thumbnail}` }} style={[styles.gridThumbImg, item.is_locked && { opacity: 0.6 }]} />
          ) : (
            <View style={[styles.gridThumb, { backgroundColor: meta.color + '18' }]}>
              <Text style={styles.gridEmoji}>{meta.emoji}</Text>
            </View>
          )}
          <Text style={[styles.gridTitle, { color: colors.textPrimary }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.gridDate, { color: colors.textSecondary }]}>{formatDate(item.created_at)}</Text>
          <View style={styles.gridFooter}>
            <View style={[styles.badge, { backgroundColor: meta.color + '18' }]}>
              <Text style={[styles.badgeText, { color: meta.color }]}>{item.document_type?.replace(/_/g, ' ').slice(0, 10)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    
    return (
      <TouchableOpacity
        testID={`history-doc-${item.id}`}
        activeOpacity={0.78}
        onPress={() => handleDocPress(item)}
        onLongPress={() => { setSelectionMode(true); toggleSelection(item.id); }}
        style={[
          styles.listCard,
          { backgroundColor: colors.surface, ...shadows.sm },
          isSelected && { borderWidth: 2, borderColor: colors.primary },
        ]}
      >
        {selectionMode && (
          <View style={[styles.listCheckbox, { backgroundColor: isSelected ? colors.primary : colors.surfaceHighlight }]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
          </View>
        )}
        <View style={styles.thumbContainer}>
          {item.image_thumbnail ? (
            <Image source={{ uri: `data:image/jpeg;base64,${item.image_thumbnail}` }} style={[styles.listThumbImg, item.is_locked && { opacity: 0.6 }]} />
          ) : (
            <View style={[styles.listThumb, { backgroundColor: meta.color + '18' }]}>
              <Text style={styles.listEmoji}>{meta.emoji}</Text>
            </View>
          )}
          {item.is_locked && (
            <View style={styles.listLockBadge}>
              <Ionicons name="lock-closed" size={12} color="#FFF" />
            </View>
          )}
        </View>
        <View style={styles.listInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.listTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
            {item.is_locked && (
              <View style={[styles.lockedTag, { backgroundColor: '#EF4444' + '20' }]}>
                <Ionicons name="lock-closed" size={10} color="#EF4444" />
                <Text style={[styles.lockedTagText, { color: '#EF4444' }]}>Locked</Text>
              </View>
            )}
          </View>
          <Text style={[styles.listDate, { color: colors.textSecondary }]}>{formatDate(item.created_at)}</Text>
          <View style={styles.listMeta}>
            <View style={[styles.badge, { backgroundColor: meta.color + '18' }]}>
              <Text style={[styles.badgeText, { color: meta.color }]}>{meta.emoji} {item.document_type?.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={[styles.sizeText, { color: colors.textTertiary }]}>{item.detected_language}</Text>
          </View>
        </View>
        {!selectionMode && (
          <TouchableOpacity
            testID={`delete-doc-${item.id}`}
            activeOpacity={0.7}
            style={styles.menuBtn}
            onPress={() => item.is_locked ? handleRemovePassword(item.id) : deleteDoc(item.id)}
            accessibilityLabel={item.is_locked ? "Remove password" : "Delete document"}
          >
            <Ionicons name={item.is_locked ? "lock-open-outline" : "trash-outline"} size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>History</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {filtered.length} document{filtered.length !== 1 ? 's' : ''}
            {lockedCount > 0 && ` • ${lockedCount} locked`}
          </Text>
        </View>
        {selectionMode ? (
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={[styles.selectionBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowSetPassword(true)}
              disabled={selectedDocs.size === 0}
            >
              <Ionicons name="lock-closed" size={18} color="#FFF" />
              <Text style={styles.selectionBtnText}>Lock ({selectedDocs.size})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelSelectionBtn, { borderColor: colors.border }]}
              onPress={() => { setSelectionMode(false); setSelectedDocs(new Set()); }}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            testID="select-btn"
            style={[styles.iconBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
            activeOpacity={0.7}
            onPress={() => setSelectionMode(true)}
            accessibilityLabel="Select documents"
          >
            <Ionicons name="checkbox-outline" size={21} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, ...shadows.sm }]}>
        <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
        <TextInput
          testID="history-search-input"
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search documents..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={styles.filtersContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            testID={`filter-${f.id}`}
            style={[
              styles.filterChip,
              { backgroundColor: activeFilter === f.id ? colors.primary : colors.surface, ...shadows.sm },
            ]}
            onPress={() => setActiveFilter(f.id as FilterType)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterText, { color: activeFilter === f.id ? '#FFF' : colors.textSecondary }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          testID="sort-btn"
          style={[styles.toolBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
          onPress={() => setShowSort(true)}
        >
          <Ionicons name="swap-vertical-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.toolText, { color: colors.textSecondary }]}>{sortBy}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="view-toggle-btn"
          style={[styles.toolBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
          onPress={() => setIsGrid(g => !g)}
        >
          <Ionicons name={isGrid ? 'list-outline' : 'grid-outline'} size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Document List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={isGrid ? styles.gridContainer : styles.listContainer}
          numColumns={isGrid ? 2 : 1}
          key={isGrid ? 'grid' : 'list'}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="documents-outline" size={56} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No documents found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                {activeFilter === 'locked' ? 'No locked documents' : 'Start scanning to add documents'}
              </Text>
            </View>
          }
        />
      )}

      {/* Sort Modal */}
      <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSort(false)}>
          <View style={[styles.sortModal, { backgroundColor: colors.surface, ...shadows.lg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.sortTitle, { color: colors.textPrimary }]}>Sort By</Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                testID={`sort-${opt}`}
                style={[styles.sortOption, sortBy === opt && { backgroundColor: colors.primary + '18' }]}
                onPress={() => { setSortBy(opt); setShowSort(false); }}
              >
                <Text style={[styles.sortOptionText, { color: sortBy === opt ? colors.primary : colors.textPrimary }]}>{opt}</Text>
                {sortBy === opt && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Set Password Modal */}
      <Modal visible={showSetPassword} transparent animationType="fade" onRequestClose={() => setShowSetPassword(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSetPassword(false)}>
          <View style={[styles.passwordModal, { backgroundColor: colors.surface, ...shadows.lg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.passwordHeader}>
              <View style={[styles.passwordIconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="lock-closed" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.passwordTitle, { color: colors.textPrimary }]}>Set Password</Text>
              <Text style={[styles.passwordSubtitle, { color: colors.textSecondary }]}>
                Protect {selectedDocs.size} selected document{selectedDocs.size !== 1 ? 's' : ''}
              </Text>
            </View>
            <TextInput
              testID="password-input"
              style={[styles.passwordInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Enter password (min 4 characters)"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              testID="confirm-password-input"
              style={[styles.passwordInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Confirm password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <View style={styles.passwordActions}>
              <TouchableOpacity
                style={[styles.passwordCancelBtn, { borderColor: colors.border }]}
                onPress={() => { setShowSetPassword(false); setPassword(''); setConfirmPassword(''); }}
              >
                <Text style={[styles.passwordCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.passwordConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleSetPassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.passwordConfirmText}>Lock Documents</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Unlock Password Modal */}
      <Modal visible={showUnlockPassword} transparent animationType="fade" onRequestClose={() => { setShowUnlockPassword(false); setPassword(''); }}>
        <Pressable style={styles.modalOverlay} onPress={() => { setShowUnlockPassword(false); setPassword(''); }}>
          <View style={[styles.passwordModal, { backgroundColor: colors.surface, ...shadows.lg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.passwordHeader}>
              <View style={[styles.passwordIconWrap, { backgroundColor: '#EF4444' + '18' }]}>
                <Ionicons name="lock-closed" size={28} color="#EF4444" />
              </View>
              <Text style={[styles.passwordTitle, { color: colors.textPrimary }]}>Document Locked</Text>
              <Text style={[styles.passwordSubtitle, { color: colors.textSecondary }]}>
                Enter password to view this document
              </Text>
            </View>
            <TextInput
              testID="unlock-password-input"
              style={[styles.passwordInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Enter password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
            />
            <View style={styles.passwordActions}>
              <TouchableOpacity
                style={[styles.passwordCancelBtn, { borderColor: colors.border }]}
                onPress={() => { setShowUnlockPassword(false); setPassword(''); }}
              >
                <Text style={[styles.passwordCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.passwordConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleUnlockDocument}
                disabled={passwordLoading || !password}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.passwordConfirmText}>Unlock</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  iconBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  
  selectionActions: { flexDirection: 'row', gap: 8 },
  selectionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  selectionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  cancelSelectionBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginTop: 4 },
  searchInput: { flex: 1, fontSize: 15 },
  
  filtersRow: { marginTop: 12, maxHeight: 44 },
  filtersContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterText: { fontSize: 13, fontWeight: '600' },
  
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 12, marginBottom: 8 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  toolText: { fontSize: 13, fontWeight: '500' },
  
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  gridContainer: { paddingHorizontal: 14, paddingBottom: 100 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  
  gridCard: { flex: 1, margin: 6, borderRadius: 16, padding: 12, position: 'relative' },
  gridThumbImg: { width: '100%', aspectRatio: 0.75, borderRadius: 10, marginBottom: 10 },
  gridThumb: { width: '100%', aspectRatio: 0.75, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  gridEmoji: { fontSize: 36 },
  gridTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  gridDate: { fontSize: 11, marginBottom: 8 },
  gridFooter: { flexDirection: 'row' },
  
  checkbox: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  lockBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, zIndex: 10 },
  
  listCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 10 },
  thumbContainer: { position: 'relative' },
  listThumbImg: { width: 60, height: 75, borderRadius: 10 },
  listThumb: { width: 60, height: 75, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  listEmoji: { fontSize: 28 },
  listLockBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#EF4444', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  listCheckbox: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  listInfo: { flex: 1, marginLeft: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  lockedTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lockedTagText: { fontSize: 10, fontWeight: '700' },
  listDate: { fontSize: 12, marginTop: 3, marginBottom: 6 },
  listMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  sizeText: { fontSize: 11 },
  menuBtn: { padding: 8 },
  
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  sortModal: { width: '80%', borderRadius: 20, padding: 20 },
  sortTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 },
  sortOptionText: { fontSize: 15 },
  
  passwordModal: { width: '85%', borderRadius: 24, padding: 24 },
  passwordHeader: { alignItems: 'center', marginBottom: 24 },
  passwordIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  passwordTitle: { fontSize: 20, fontWeight: '700' },
  passwordSubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  passwordInput: { borderRadius: 14, padding: 16, fontSize: 16, borderWidth: 1, marginBottom: 12 },
  passwordActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  passwordCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  passwordCancelText: { fontSize: 15, fontWeight: '600' },
  passwordConfirmBtn: { flex: 1.5, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  passwordConfirmText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
