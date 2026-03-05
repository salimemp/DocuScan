import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  StatusBar, ScrollView, Modal, Pressable, Alert,
  RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useFocusEffect } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

type FilterType = 'All' | 'passport' | 'invoice' | 'receipt' | 'business_card' | 'contract' | 'handwritten_note' | 'general_document';
type SortType = 'Latest' | 'Oldest' | 'A–Z' | 'Z–A';

const FILTERS = [
  { id: 'All', label: 'All' },
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
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [sortBy, setSortBy] = useState<SortType>('Latest');
  const [isGrid, setIsGrid] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const filtered = useMemo(() => {
    let list = [...docs];
    if (activeFilter !== 'All') list = list.filter(d => d.document_type === activeFilter);
    if (search.trim()) list = list.filter(d => d.title?.toLowerCase().includes(search.toLowerCase()) || d.summary?.toLowerCase().includes(search.toLowerCase()));
    if (sortBy === 'A–Z') list.sort((a, b) => a.title?.localeCompare(b.title));
    else if (sortBy === 'Z–A') list.sort((a, b) => b.title?.localeCompare(a.title));
    else if (sortBy === 'Oldest') list.reverse();
    return list;
  }, [docs, activeFilter, search, sortBy]);

  const renderItem = ({ item }: { item: any }) => {
    const meta = getMeta(item.document_type);
    if (isGrid) {
      return (
        <TouchableOpacity
          testID={`history-doc-${item.id}`}
          activeOpacity={0.78}
          style={[styles.gridCard, { backgroundColor: colors.surface, ...shadows.sm }]}
        >
          {item.image_thumbnail ? (
            <Image source={{ uri: `data:image/jpeg;base64,${item.image_thumbnail}` }} style={styles.gridThumbImg} />
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
        style={[styles.listCard, { backgroundColor: colors.surface, ...shadows.sm }]}
      >
        {item.image_thumbnail ? (
          <Image source={{ uri: `data:image/jpeg;base64,${item.image_thumbnail}` }} style={styles.listThumbImg} />
        ) : (
          <View style={[styles.listThumb, { backgroundColor: meta.color + '18' }]}>
            <Text style={styles.listEmoji}>{meta.emoji}</Text>
          </View>
        )}
        <View style={styles.listInfo}>
          <Text style={[styles.listTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.listDate, { color: colors.textSecondary }]}>{formatDate(item.created_at)}</Text>
          <View style={styles.listMeta}>
            <View style={[styles.badge, { backgroundColor: meta.color + '18' }]}>
              <Text style={[styles.badgeText, { color: meta.color }]}>{meta.emoji} {item.document_type?.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={[styles.sizeText, { color: colors.textTertiary }]}>{item.detected_language}</Text>
          </View>
        </View>
        <TouchableOpacity
          testID={`delete-doc-${item.id}`}
          activeOpacity={0.7}
          style={styles.menuBtn}
          onPress={() => deleteDoc(item.id)}
          accessibilityLabel="Delete document"
        >
          <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
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
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{filtered.length} document{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity testID="notifications-btn" style={[styles.iconBtn, { backgroundColor: colors.surface, ...shadows.sm }]} activeOpacity={0.7} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={21} color={colors.textSecondary} />
        </TouchableOpacity>
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
          <TouchableOpacity testID="clear-search-btn" onPress={() => setSearch('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} style={styles.filterScroll}>
        {FILTERS.map(({ id, label }) => {
          const active = activeFilter === id;
          return (
            <TouchableOpacity
              key={id}
              testID={`filter-chip-${id}`}
              activeOpacity={0.75}
              onPress={() => setActiveFilter(id as FilterType)}
              style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border, ...(!active && shadows.sm) }]}
            >
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sort & Toggle Row */}
      <View style={styles.controlRow}>
        <TouchableOpacity
          testID="sort-btn"
          activeOpacity={0.75}
          onPress={() => setShowSort(true)}
          style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}
        >
          <Ionicons name="swap-vertical-outline" size={15} color={colors.primary} />
          <Text style={[styles.sortBtnText, { color: colors.primary }]}>{sortBy}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.toggleWrap}>
          <TouchableOpacity testID="list-view-btn" activeOpacity={0.75} onPress={() => setIsGrid(false)} style={[styles.toggleBtn, { backgroundColor: !isGrid ? colors.primary : colors.surface, borderColor: !isGrid ? colors.primary : colors.border }]} accessibilityLabel="List view">
            <Ionicons name="list-outline" size={18} color={!isGrid ? '#FFFFFF' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity testID="grid-view-btn" activeOpacity={0.75} onPress={() => setIsGrid(true)} style={[styles.toggleBtn, { backgroundColor: isGrid ? colors.primary : colors.surface, borderColor: isGrid ? colors.primary : colors.border }]} accessibilityLabel="Grid view">
            <Ionicons name="grid-outline" size={18} color={isGrid ? '#FFFFFF' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading documents...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceHighlight }]}>
            <Ionicons name="document-text-outline" size={40} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {docs.length === 0 ? 'No documents yet' : 'No documents found'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {docs.length === 0 ? 'Scan your first document to get started' : 'Try a different search or filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          key={isGrid ? 'grid' : 'list'}
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={isGrid ? 2 : 1}
          columnWrapperStyle={isGrid ? styles.gridWrapper : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}

      {/* Sort Modal */}
      <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSort(false)}>
          <View style={[styles.sortModal, { backgroundColor: colors.surface, ...shadows.lg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.sortModalTitle, { color: colors.textPrimary }]}>Sort by</Text>
            {SORT_OPTIONS.map(opt => {
              const active = sortBy === opt;
              return (
                <TouchableOpacity key={opt} testID={`sort-option-${opt}`} activeOpacity={0.75} onPress={() => { setSortBy(opt); setShowSort(false); }}
                  style={[styles.sortOption, active && { backgroundColor: colors.primary + '14' }]}>
                  <Text style={[styles.sortOptionText, { color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '700' : '500' }]}>{opt}</Text>
                  {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 14, borderRadius: 14, paddingHorizontal: 14, height: 48, gap: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  filterScroll: { marginBottom: 12 },
  filterRow: { paddingHorizontal: 20, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  sortBtnText: { fontSize: 13, fontWeight: '600' },
  toggleWrap: { flexDirection: 'row', gap: 8 },
  toggleBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  gridWrapper: { gap: 12 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 14 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  emptyIcon: { width: 84, height: 84, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  // Grid card
  gridCard: { borderRadius: 16, padding: 12, marginBottom: 12, flex: 1 },
  gridThumb: { height: 90, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  gridThumbImg: { height: 90, borderRadius: 12, marginBottom: 10, resizeMode: 'cover' },
  gridEmoji: { fontSize: 32 },
  gridTitle: { fontSize: 13, fontWeight: '600', marginBottom: 3, lineHeight: 18 },
  gridDate: { fontSize: 11, marginBottom: 8 },
  gridFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // List card
  listCard: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  listThumb: { width: 54, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listThumbImg: { width: 54, height: 54, borderRadius: 12, resizeMode: 'cover' },
  listEmoji: { fontSize: 24 },
  listInfo: { flex: 1, gap: 3 },
  listTitle: { fontSize: 14, fontWeight: '600' },
  listDate: { fontSize: 12 },
  listMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  menuBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  sizeText: { fontSize: 11 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sortModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 4 },
  sortModalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 },
  sortOptionText: { fontSize: 15 },
});
