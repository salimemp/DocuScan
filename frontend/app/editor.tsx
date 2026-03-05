import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../hooks/useTheme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

type FormatStyle = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'h1' | 'h2' | 'h3' | 'bulletList' | 'numberList' | 'alignLeft' | 'alignCenter' | 'alignRight';

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];
const COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
];

export default function EditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, shadows, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Formatting state
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState('#000000');
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<FormatStyle>>(new Set());
  
  // Selection state
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const fetchDocument = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${id}`);
      if (!res.ok) throw new Error('Document not found');
      const data = await res.json();
      setDoc(data);
      setTitle(data.title || '');
      const initialContent = data.formatted_output || data.raw_text || '';
      setContent(initialContent);
      setHistory([initialContent]);
      setHistoryIndex(0);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) fetchDocument();
  }, [id, fetchDocument]);

  const saveToHistory = (newContent: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    if (newHistory.length > 50) newHistory.shift(); // Keep last 50 states
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setContent(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setContent(history[historyIndex + 1]);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || doc?.title,
          formatted_output: content,
          is_edited: true,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      router.back();
    } catch (e: any) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!hasChanges) {
      router.back();
      return;
    }
    Alert.alert(
      'Discard Changes?',
      'You have unsaved changes. Are you sure you want to discard them?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  const insertFormatting = (format: FormatStyle) => {
    const { start, end } = selection;
    const selectedText = content.substring(start, end);
    let newText = '';
    let prefix = '';
    let suffix = '';

    switch (format) {
      case 'bold':
        prefix = '**';
        suffix = '**';
        break;
      case 'italic':
        prefix = '_';
        suffix = '_';
        break;
      case 'underline':
        prefix = '__';
        suffix = '__';
        break;
      case 'strikethrough':
        prefix = '~~';
        suffix = '~~';
        break;
      case 'h1':
        prefix = '\n# ';
        suffix = '\n';
        break;
      case 'h2':
        prefix = '\n## ';
        suffix = '\n';
        break;
      case 'h3':
        prefix = '\n### ';
        suffix = '\n';
        break;
      case 'bulletList':
        prefix = '\n• ';
        suffix = '';
        break;
      case 'numberList':
        prefix = '\n1. ';
        suffix = '';
        break;
      case 'alignLeft':
      case 'alignCenter':
      case 'alignRight':
        // These would need rich text support
        break;
    }

    if (selectedText) {
      newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
    } else {
      newText = content.substring(0, start) + prefix + suffix + content.substring(end);
    }

    setContent(newText);
    setHasChanges(true);
    saveToHistory(newText);
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    setHasChanges(true);
  };

  const handleContentBlur = () => {
    if (content !== history[historyIndex]) {
      saveToHistory(content);
    }
  };

  const formatButtons: { icon: string; format: FormatStyle; label: string }[] = [
    { icon: 'text', format: 'bold', label: 'Bold' },
    { icon: 'italic', format: 'italic', label: 'Italic' },
    { icon: 'remove-outline', format: 'underline', label: 'Underline' },
  ];

  const headingButtons: { icon: string; format: FormatStyle; label: string }[] = [
    { icon: 'reorder-four', format: 'h1', label: 'H1' },
    { icon: 'reorder-three', format: 'h2', label: 'H2' },
    { icon: 'reorder-two', format: 'h3', label: 'H3' },
  ];

  const listButtons: { icon: string; format: FormatStyle; label: string }[] = [
    { icon: 'list', format: 'bulletList', label: 'Bullets' },
    { icon: 'list-outline', format: 'numberList', label: 'Numbered' },
  ];

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading editor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          testID="editor-back-btn"
          onPress={handleDiscard}
          style={styles.headerBtn}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          Document Editor
        </Text>
        <TouchableOpacity
          testID="editor-save-btn"
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Title Input */}
        <View style={[styles.titleSection, { borderBottomColor: colors.border }]}>
          <TextInput
            testID="editor-title-input"
            style={[styles.titleInput, { color: colors.textPrimary }]}
            value={title}
            onChangeText={(text) => { setTitle(text); setHasChanges(true); }}
            placeholder="Document Title"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Main Formatting Toolbar */}
        <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
            {/* Undo/Redo */}
            <TouchableOpacity
              testID="undo-btn"
              style={[styles.toolbarBtn, historyIndex <= 0 && styles.toolbarBtnDisabled]}
              onPress={handleUndo}
              disabled={historyIndex <= 0}
            >
              <Ionicons name="arrow-undo" size={20} color={historyIndex <= 0 ? colors.textTertiary : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="redo-btn"
              style={[styles.toolbarBtn, historyIndex >= history.length - 1 && styles.toolbarBtnDisabled]}
              onPress={handleRedo}
              disabled={historyIndex >= history.length - 1}
            >
              <Ionicons name="arrow-redo" size={20} color={historyIndex >= history.length - 1 ? colors.textTertiary : colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.toolbarDivider, { backgroundColor: colors.border }]} />

            {/* Font Size */}
            <TouchableOpacity
              testID="font-size-btn"
              style={styles.toolbarDropdown}
              onPress={() => setShowFontSizeMenu(true)}
            >
              <Text style={[styles.toolbarDropdownText, { color: colors.textPrimary }]}>{fontSize}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Text Color */}
            <TouchableOpacity
              testID="text-color-btn"
              style={styles.toolbarBtn}
              onPress={() => setShowColorMenu(true)}
            >
              <View style={styles.colorBtnInner}>
                <Ionicons name="color-palette-outline" size={18} color={colors.textSecondary} />
                <View style={[styles.colorIndicator, { backgroundColor: textColor }]} />
              </View>
            </TouchableOpacity>

            <View style={[styles.toolbarDivider, { backgroundColor: colors.border }]} />

            {/* Format buttons */}
            {formatButtons.map(({ icon, format, label }) => (
              <TouchableOpacity
                key={format}
                testID={`format-${format}`}
                onPress={() => insertFormatting(format)}
                style={[
                  styles.toolbarBtn,
                  activeFormats.has(format) && { backgroundColor: colors.primary + '20' },
                ]}
                accessibilityLabel={label}
              >
                <Ionicons
                  name={icon as any}
                  size={20}
                  color={activeFormats.has(format) ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              testID="format-strikethrough"
              onPress={() => insertFormatting('strikethrough')}
              style={styles.toolbarBtn}
            >
              <Text style={[styles.strikeText, { color: colors.textSecondary }]}>S̶</Text>
            </TouchableOpacity>

            <View style={[styles.toolbarDivider, { backgroundColor: colors.border }]} />

            {/* Headings */}
            {headingButtons.map(({ icon, format, label }) => (
              <TouchableOpacity
                key={format}
                testID={`format-${format}`}
                onPress={() => insertFormatting(format)}
                style={styles.toolbarBtn}
                accessibilityLabel={label}
              >
                <Text style={[styles.headingLabel, { color: colors.textSecondary }]}>{label}</Text>
              </TouchableOpacity>
            ))}

            <View style={[styles.toolbarDivider, { backgroundColor: colors.border }]} />

            {/* Lists */}
            {listButtons.map(({ icon, format, label }) => (
              <TouchableOpacity
                key={format}
                testID={`format-${format}`}
                onPress={() => insertFormatting(format)}
                style={styles.toolbarBtn}
                accessibilityLabel={label}
              >
                <Ionicons name={icon as any} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content Editor */}
        <ScrollView style={styles.editorScroll} contentContainerStyle={styles.editorContent}>
          <TextInput
            ref={inputRef}
            testID="editor-content-input"
            style={[
              styles.contentInput,
              { color: colors.textPrimary, fontSize },
            ]}
            value={content}
            onChangeText={handleContentChange}
            onBlur={handleContentBlur}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            placeholder="Start typing or edit your document content..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </ScrollView>

        {/* Bottom Status Bar */}
        <View style={[styles.statusBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.statusLeft}>
            <Ionicons
              name={hasChanges ? 'ellipse' : 'checkmark-circle'}
              size={14}
              color={hasChanges ? '#F59E0B' : colors.success}
            />
            <Text style={[styles.statusText, { color: colors.textTertiary }]}>
              {hasChanges ? 'Unsaved changes' : 'All changes saved'}
            </Text>
          </View>
          <View style={styles.statusRight}>
            <Text style={[styles.statusText, { color: colors.textTertiary }]}>
              {content.length} chars
            </Text>
            <Text style={[styles.statusText, { color: colors.textTertiary }]}>
              {content.split(/\s+/).filter(Boolean).length} words
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Font Size Menu */}
      <Modal visible={showFontSizeMenu} transparent animationType="fade" onRequestClose={() => setShowFontSizeMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowFontSizeMenu(false)}>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, ...shadows.lg }]}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Font Size</Text>
            <View style={styles.fontSizeGrid}>
              {FONT_SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.fontSizeBtn,
                    { backgroundColor: fontSize === size ? colors.primary : colors.surfaceHighlight },
                  ]}
                  onPress={() => { setFontSize(size); setShowFontSizeMenu(false); }}
                >
                  <Text style={[
                    styles.fontSizeBtnText,
                    { color: fontSize === size ? '#FFF' : colors.textPrimary },
                  ]}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Color Menu */}
      <Modal visible={showColorMenu} transparent animationType="fade" onRequestClose={() => setShowColorMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowColorMenu(false)}>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, ...shadows.lg }]}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Text Color</Text>
            <View style={styles.colorGrid}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorBtn,
                    { backgroundColor: color },
                    textColor === color && styles.colorBtnSelected,
                  ]}
                  onPress={() => { setTextColor(color); setShowColorMenu(false); }}
                >
                  {textColor === color && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </TouchableOpacity>
              ))}
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

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  titleSection: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5 },
  titleInput: { fontSize: 22, fontWeight: '700' },

  toolbar: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 0.5 },
  toolbarContent: { paddingHorizontal: 12, gap: 2, alignItems: 'center' },
  toolbarBtn: {
    width: 38, height: 38, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  toolbarBtnDisabled: { opacity: 0.4 },
  toolbarDivider: { width: 1, height: 24, alignSelf: 'center', marginHorizontal: 6 },
  toolbarDropdown: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, height: 38, borderRadius: 8,
  },
  toolbarDropdownText: { fontSize: 14, fontWeight: '600' },
  colorBtnInner: { alignItems: 'center' },
  colorIndicator: { width: 14, height: 3, borderRadius: 1, marginTop: 2 },
  strikeText: { fontSize: 18, fontWeight: '600', textDecorationLine: 'line-through' },
  headingLabel: { fontSize: 12, fontWeight: '700' },

  editorScroll: { flex: 1 },
  editorContent: { padding: 20, paddingBottom: 100 },
  contentInput: { lineHeight: 28, minHeight: 400 },

  statusBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 0.5,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusText: { fontSize: 12 },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuCard: { width: '80%', maxWidth: 320, borderRadius: 16, padding: 20 },
  menuTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  fontSizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fontSizeBtn: { width: 52, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fontSizeBtnText: { fontSize: 14, fontWeight: '600' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  colorBtnSelected: { borderWidth: 3, borderColor: '#FFF' },
});
