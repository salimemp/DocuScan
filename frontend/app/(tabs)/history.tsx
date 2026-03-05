import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { mockDocuments, Document } from '../../data/mockDocuments';
import { DocumentCard } from '../../components/DocumentCard';

type FilterType = 'All' | 'PDF' | 'JPG' | 'PNG' | 'DOCX' | 'XLSX';
type SortType = 'Latest' | 'Oldest' | 'A–Z' | 'Z–A' | 'Size';

const filters: FilterType[] = ['All', 'PDF', 'JPG', 'PNG', 'DOCX', 'XLSX'];
const sortOptions: SortType[] = ['Latest', 'Oldest', 'A–Z', 'Z–A', 'Size'];

export default function HistoryScreen() {
  const { colors, shadows, isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [sortBy, setSortBy] = useState<SortType>('Latest');
  const [isGrid, setIsGrid] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const filtered = useMemo(() => {
    let docs: Document[] = [...mockDocuments];
    if (activeFilter !== 'All') {
      docs = docs.filter((d) => d.type === activeFilter);
    }
    if (search.trim()) {
      docs = docs.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (sortBy === 'A–Z') docs.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'Z–A') docs.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortBy === 'Oldest') docs.reverse();
    return docs;
  }, [activeFilter, search, sortBy]);

  const renderItem = ({ item, index }: { item: Document; index: number }) => (
    <DocumentCard
      doc={item}
      isGrid={isGrid}
      testID={`history-doc-${item.id}`}
    />
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>History</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {filtered.length} document{filtered.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          testID="notifications-btn"
          style={[styles.iconBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
          activeOpacity={0.7}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={21} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
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

      {/* ── Filter Chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {filters.map((filter) => {
          const active = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              testID={`filter-chip-${filter}`}
              activeOpacity={0.75}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                  ...(!active && shadows.sm),
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Sort & Toggle Row ── */}
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
          <TouchableOpacity
            testID="list-view-btn"
            activeOpacity={0.75}
            onPress={() => setIsGrid(false)}
            style={[
              styles.toggleBtn,
              {
                backgroundColor: !isGrid ? colors.primary : colors.surface,
                borderColor: !isGrid ? colors.primary : colors.border,
              },
            ]}
            accessibilityLabel="List view"
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={!isGrid ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            testID="grid-view-btn"
            activeOpacity={0.75}
            onPress={() => setIsGrid(true)}
            style={[
              styles.toggleBtn,
              {
                backgroundColor: isGrid ? colors.primary : colors.surface,
                borderColor: isGrid ? colors.primary : colors.border,
              },
            ]}
            accessibilityLabel="Grid view"
          >
            <Ionicons
              name="grid-outline"
              size={18}
              color={isGrid ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Document List / Grid ── */}
      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceHighlight }]}>
            <Ionicons name="document-text-outline" size={40} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No documents found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Try a different search or filter
          </Text>
        </View>
      ) : (
        <FlatList
          key={isGrid ? 'grid' : 'list'}
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={isGrid ? 2 : 1}
          columnWrapperStyle={isGrid ? styles.gridWrapper : undefined}
          contentContainerStyle={[styles.listContent, isGrid && styles.gridContent]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Sort Modal ── */}
      <Modal
        visible={showSort}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSort(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSort(false)}>
          <View
            style={[styles.sortModal, { backgroundColor: colors.surface, ...shadows.lg }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.sortModalTitle, { color: colors.textPrimary }]}>Sort by</Text>
            {sortOptions.map((opt) => {
              const active = sortBy === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  testID={`sort-option-${opt}`}
                  activeOpacity={0.75}
                  onPress={() => { setSortBy(opt); setShowSort(false); }}
                  style={[
                    styles.sortOption,
                    active && { backgroundColor: colors.primary + '14' },
                  ]}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      { color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {opt}
                  </Text>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },

  filterScroll: { marginBottom: 12 },
  filterRow: { paddingHorizontal: 20, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  sortBtnText: { fontSize: 13, fontWeight: '600' },
  toggleWrap: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  gridContent: {},
  gridWrapper: { gap: 12 },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySubtitle: { fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sortModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 4,
  },
  sortModalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sortOptionText: { fontSize: 15 },
});
