import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../hooks/useTheme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

type FormatStyle = 'bold' | 'italic' | 'underline' | 'heading' | 'list';

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
  const [activeFormats, setActiveFormats] = useState<Set<FormatStyle>>(new Set());

  const fetchDocument = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${id}`);
      if (!res.ok) throw new Error('Document not found');
      const data = await res.json();
      setDoc(data);
      setTitle(data.title || '');
      setContent(data.formatted_output || data.raw_text || '');
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

  const toggleFormat = (format: FormatStyle) => {
    setActiveFormats(prev => {
      const next = new Set(prev);
      if (next.has(format)) {
        next.delete(format);
      } else {
        next.add(format);
      }
      return next;
    });
  };

  const insertFormatting = (format: FormatStyle) => {
    toggleFormat(format);
    // Simple text formatting markers
    const markers: Record<FormatStyle, [string, string]> = {
      bold: ['**', '**'],
      italic: ['_', '_'],
      underline: ['__', '__'],
      heading: ['\n## ', '\n'],
      list: ['\n• ', ''],
    };
    const [prefix, suffix] = markers[format];
    setContent(prev => prev + prefix + suffix);
    setHasChanges(true);
  };

  const formatButtons: { icon: string; format: FormatStyle; label: string }[] = [
    { icon: 'text', format: 'bold', label: 'Bold' },
    { icon: 'italic', format: 'italic', label: 'Italic' },
    { icon: 'remove-outline', format: 'underline', label: 'Underline' },
    { icon: 'reorder-four', format: 'heading', label: 'Heading' },
    { icon: 'list', format: 'list', label: 'List' },
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
          Edit Document
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

        {/* Formatting Toolbar */}
        <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
            {formatButtons.map(({ icon, format, label }) => {
              const isActive = activeFormats.has(format);
              return (
                <TouchableOpacity
                  key={format}
                  testID={`format-${format}`}
                  onPress={() => insertFormatting(format)}
                  style={[
                    styles.toolbarBtn,
                    { backgroundColor: isActive ? colors.primary + '20' : 'transparent' },
                  ]}
                  accessibilityLabel={label}
                >
                  <Ionicons
                    name={icon as any}
                    size={20}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
            <View style={[styles.toolbarDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              testID="undo-btn"
              style={styles.toolbarBtn}
              onPress={() => {
                if (doc?.formatted_output) {
                  setContent(doc.formatted_output);
                  setHasChanges(false);
                }
              }}
            >
              <Ionicons name="arrow-undo" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Content Editor */}
        <ScrollView style={styles.editorScroll} contentContainerStyle={styles.editorContent}>
          <TextInput
            ref={inputRef}
            testID="editor-content-input"
            style={[styles.contentInput, { color: colors.textPrimary }]}
            value={content}
            onChangeText={(text) => { setContent(text); setHasChanges(true); }}
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
          <Text style={[styles.statusText, { color: colors.textTertiary }]}>
            {content.length} characters
          </Text>
        </View>
      </KeyboardAvoidingView>
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

  toolbar: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 0.5 },
  toolbarContent: { paddingHorizontal: 16, gap: 4 },
  toolbarBtn: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  toolbarDivider: { width: 1, height: 24, alignSelf: 'center', marginHorizontal: 8 },

  editorScroll: { flex: 1 },
  editorContent: { padding: 20, paddingBottom: 100 },
  contentInput: { fontSize: 15, lineHeight: 24, minHeight: 300 },

  statusBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 0.5,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 12 },
});
