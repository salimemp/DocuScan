import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, Pressable, Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../hooks/useTheme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ToolCategory = 'text' | 'page' | 'insert' | 'effects' | 'ai';

interface EditorTool {
  id: string;
  icon: string;
  label: string;
  category: ToolCategory;
  action?: () => void;
}

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
  
  // Tool states
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('text');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showPageManager, setShowPageManager] = useState(false);
  const [showWatermark, setShowWatermark] = useState(false);
  const [showCloudSync, setShowCloudSync] = useState(false);
  
  // AI Assistant
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Watermark
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  
  // Pages
  const [pages, setPages] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hiddenPages, setHiddenPages] = useState<Set<number>>(new Set());
  
  // Font/formatting
  const [fontSize, setFontSize] = useState(16);
  const [showFontMenu, setShowFontMenu] = useState(false);
  
  // Selection
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
      
      // Initialize pages from thumbnails or create single page
      if (data.pages_thumbnails?.length > 0) {
        setPages(data.pages_thumbnails.map((thumb: string, i: number) => ({
          id: i,
          thumbnail: thumb,
          content: i === 0 ? initialContent : '',
        })));
      } else if (data.image_thumbnail) {
        setPages([{ id: 0, thumbnail: data.image_thumbnail, content: initialContent }]);
      } else {
        setPages([{ id: 0, thumbnail: null, content: initialContent }]);
      }
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
    if (newHistory.length > 50) newHistory.shift();
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
          pages_data: pages,
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
    Alert.alert('Discard Changes?', 'You have unsaved changes.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  // ── Text Formatting ─────────────────────────────────────────────────────
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const { start, end } = selection;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
    setContent(newText);
    setHasChanges(true);
    saveToHistory(newText);
  };

  // ── Page Operations ─────────────────────────────────────────────────────
  const addPage = () => {
    const newPage = { id: pages.length, thumbnail: null, content: '' };
    setPages([...pages, newPage]);
    setCurrentPage(pages.length);
    setHasChanges(true);
  };

  const hidePage = (pageIndex: number) => {
    setHiddenPages(prev => {
      const next = new Set(prev);
      if (next.has(pageIndex)) {
        next.delete(pageIndex);
      } else {
        next.add(pageIndex);
      }
      return next;
    });
    setHasChanges(true);
  };

  const deletePage = (pageIndex: number) => {
    if (pages.length <= 1) {
      Alert.alert('Cannot Delete', 'Document must have at least one page.');
      return;
    }
    Alert.alert('Delete Page?', `Delete page ${pageIndex + 1}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setPages(pages.filter((_, i) => i !== pageIndex));
          if (currentPage >= pageIndex && currentPage > 0) {
            setCurrentPage(currentPage - 1);
          }
          setHasChanges(true);
        },
      },
    ]);
  };

  const mergePage = (pageIndex: number) => {
    if (pageIndex >= pages.length - 1) return;
    const merged = [...pages];
    merged[pageIndex].content += '\n\n' + merged[pageIndex + 1].content;
    merged.splice(pageIndex + 1, 1);
    setPages(merged);
    setHasChanges(true);
  };

  const splitPage = () => {
    const { start, end } = selection;
    if (start === end) {
      Alert.alert('Split Page', 'Select where to split the page first.');
      return;
    }
    const beforeSplit = content.substring(0, start);
    const afterSplit = content.substring(end);
    
    const updatedPages = [...pages];
    updatedPages[currentPage].content = beforeSplit;
    const newPage = { id: pages.length, thumbnail: null, content: afterSplit };
    updatedPages.splice(currentPage + 1, 0, newPage);
    
    setPages(updatedPages);
    setContent(beforeSplit);
    setHasChanges(true);
  };

  const reorderPages = (fromIndex: number, toIndex: number) => {
    const reordered = [...pages];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setPages(reordered);
    setHasChanges(true);
  };

  // ── AI Assistant ────────────────────────────────────────────────────────
  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: id,
          message: aiQuery,
          context: content.substring(0, 2000),
        }),
      });
      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      setAiResponse(data.response);
    } catch (e: any) {
      setAiResponse(`Error: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAIResponse = () => {
    if (aiResponse) {
      setContent(prev => prev + '\n\n' + aiResponse);
      setHasChanges(true);
      saveToHistory(content + '\n\n' + aiResponse);
    }
  };

  // ── Tool Categories ─────────────────────────────────────────────────────
  const toolCategories: { id: ToolCategory; label: string; icon: string }[] = [
    { id: 'text', label: 'Text', icon: 'text' },
    { id: 'page', label: 'Page', icon: 'documents-outline' },
    { id: 'insert', label: 'Insert', icon: 'add-circle-outline' },
    { id: 'effects', label: 'Effects', icon: 'color-wand-outline' },
    { id: 'ai', label: 'AI', icon: 'sparkles' },
  ];

  const textTools: EditorTool[] = [
    { id: 'bold', icon: 'text', label: 'Bold', category: 'text', action: () => insertFormatting('**', '**') },
    { id: 'italic', icon: 'italic', label: 'Italic', category: 'text', action: () => insertFormatting('_', '_') },
    { id: 'underline', icon: 'remove-outline', label: 'Underline', category: 'text', action: () => insertFormatting('__', '__') },
    { id: 'strike', icon: 'close', label: 'Strike', category: 'text', action: () => insertFormatting('~~', '~~') },
    { id: 'h1', icon: 'reorder-four', label: 'H1', category: 'text', action: () => insertFormatting('\n# ', '\n') },
    { id: 'h2', icon: 'reorder-three', label: 'H2', category: 'text', action: () => insertFormatting('\n## ', '\n') },
    { id: 'bullet', icon: 'list', label: 'Bullet', category: 'text', action: () => insertFormatting('\n• ', '') },
    { id: 'number', icon: 'list-outline', label: 'Number', category: 'text', action: () => insertFormatting('\n1. ', '') },
  ];

  const pageTools: EditorTool[] = [
    { id: 'add-page', icon: 'add', label: 'Add Page', category: 'page', action: addPage },
    { id: 'manage-pages', icon: 'albums-outline', label: 'Manage', category: 'page', action: () => setShowPageManager(true) },
    { id: 'split', icon: 'git-branch-outline', label: 'Split', category: 'page', action: splitPage },
    { id: 'numbering', icon: 'keypad-outline', label: 'Numbering', category: 'page', action: () => {
      const numbered = content.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
      setContent(numbered);
      setHasChanges(true);
    }},
    { id: 'footer', icon: 'remove', label: 'Footer', category: 'page', action: () => {
      setContent(prev => prev + '\n\n─────────────────────────\nPage Footer');
      setHasChanges(true);
    }},
  ];

  const insertTools: EditorTool[] = [
    { id: 'image', icon: 'image-outline', label: 'Image', category: 'insert', action: () => Alert.alert('Insert Image', 'Select image from gallery') },
    { id: 'shape', icon: 'shapes-outline', label: 'Shape', category: 'insert', action: () => {
      insertFormatting('\n[□ Rectangle]\n');
    }},
    { id: 'text-box', icon: 'create-outline', label: 'Text Box', category: 'insert', action: () => {
      insertFormatting('\n┌─────────────────┐\n│ Text Box        │\n└─────────────────┘\n');
    }},
    { id: 'table', icon: 'grid-outline', label: 'Table', category: 'insert', action: () => {
      insertFormatting('\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n');
    }},
    { id: 'link', icon: 'link-outline', label: 'Link', category: 'insert', action: () => insertFormatting('[', '](url)') },
    { id: 'divider', icon: 'remove', label: 'Divider', category: 'insert', action: () => insertFormatting('\n━━━━━━━━━━━━━━━━━━━━\n') },
  ];

  const effectTools: EditorTool[] = [
    { id: 'watermark', icon: 'water-outline', label: 'Watermark', category: 'effects', action: () => setShowWatermark(true) },
    { id: 'blur', icon: 'eye-off-outline', label: 'Blur/Redact', category: 'effects', action: () => {
      const { start, end } = selection;
      if (start === end) {
        Alert.alert('Redact', 'Select text to redact first.');
        return;
      }
      const redacted = content.substring(0, start) + '█'.repeat(end - start) + content.substring(end);
      setContent(redacted);
      setHasChanges(true);
    }},
    { id: 'highlight', icon: 'color-fill-outline', label: 'Highlight', category: 'effects', action: () => insertFormatting('==', '==') },
    { id: 'markup', icon: 'brush-outline', label: 'Markup', category: 'effects', action: () => insertFormatting('[MARKUP: ', ']') },
  ];

  const aiTools: EditorTool[] = [
    { id: 'assistant', icon: 'chatbubble-ellipses-outline', label: 'Assistant', category: 'ai', action: () => setShowAIAssistant(true) },
    { id: 'summarize', icon: 'reader-outline', label: 'Summarize', category: 'ai', action: async () => {
      setAiQuery('Summarize this document concisely');
      setShowAIAssistant(true);
      setTimeout(askAI, 100);
    }},
    { id: 'translate', icon: 'language-outline', label: 'Translate', category: 'ai', action: () => {
      setAiQuery('Translate this to English');
      setShowAIAssistant(true);
    }},
    { id: 'ocr', icon: 'scan-outline', label: 'OCR', category: 'ai', action: () => Alert.alert('OCR', 'Select area to recognize text') },
    { id: 'count', icon: 'calculator-outline', label: 'Count', category: 'ai', action: () => {
      const words = content.split(/\s+/).filter(Boolean).length;
      const chars = content.length;
      const lines = content.split('\n').length;
      Alert.alert('Document Stats', `Words: ${words}\nCharacters: ${chars}\nLines: ${lines}`);
    }},
    { id: 'cloud', icon: 'cloud-outline', label: 'Cloud', category: 'ai', action: () => setShowCloudSync(true) },
  ];

  const getToolsForCategory = (category: ToolCategory) => {
    switch (category) {
      case 'text': return textTools;
      case 'page': return pageTools;
      case 'insert': return insertTools;
      case 'effects': return effectTools;
      case 'ai': return aiTools;
      default: return [];
    }
  };

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
        <TouchableOpacity testID="editor-back-btn" onPress={handleDiscard} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {title || 'Edit Document'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
            Page {currentPage + 1} of {pages.length}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.undoBtn, historyIndex <= 0 && { opacity: 0.3 }]}
            onPress={handleUndo}
            disabled={historyIndex <= 0}
          >
            <Ionicons name="arrow-undo" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.undoBtn, historyIndex >= history.length - 1 && { opacity: 0.3 }]}
            onPress={handleRedo}
            disabled={historyIndex >= history.length - 1}
          >
            <Ionicons name="arrow-redo" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
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
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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

        {/* Tool Category Tabs */}
        <View style={[styles.categoryTabs, { backgroundColor: colors.surface }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabsContent}>
            {toolCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryTab,
                  activeCategory === cat.id && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={() => setActiveCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={18}
                  color={activeCategory === cat.id ? colors.primary : colors.textSecondary}
                />
                <Text style={[
                  styles.categoryTabText,
                  { color: activeCategory === cat.id ? colors.primary : colors.textSecondary },
                ]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tools Row */}
        <View style={[styles.toolsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsContent}>
            {getToolsForCategory(activeCategory).map(tool => (
              <TouchableOpacity
                key={tool.id}
                testID={`tool-${tool.id}`}
                style={styles.toolBtn}
                onPress={tool.action}
              >
                <View style={[styles.toolIcon, { backgroundColor: colors.surfaceHighlight }]}>
                  <Ionicons name={tool.icon as any} size={18} color={colors.textPrimary} />
                </View>
                <Text style={[styles.toolLabel, { color: colors.textSecondary }]}>{tool.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Page Thumbnails Strip */}
        {pages.length > 1 && (
          <View style={[styles.pagesStrip, { backgroundColor: colors.surfaceHighlight }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pagesStripContent}>
              {pages.map((page, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.pageThumb,
                    currentPage === index && { borderColor: colors.primary, borderWidth: 2 },
                    hiddenPages.has(index) && { opacity: 0.4 },
                  ]}
                  onPress={() => setCurrentPage(index)}
                >
                  {page.thumbnail ? (
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${page.thumbnail}` }}
                      style={styles.pageThumbImg}
                    />
                  ) : (
                    <View style={[styles.pageThumbPlaceholder, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.pageThumbNum, { color: colors.textTertiary }]}>{index + 1}</Text>
                    </View>
                  )}
                  {hiddenPages.has(index) && (
                    <View style={styles.hiddenBadge}>
                      <Ionicons name="eye-off" size={10} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Content Editor */}
        <ScrollView style={styles.editorScroll} contentContainerStyle={styles.editorContent}>
          <TextInput
            ref={inputRef}
            testID="editor-content-input"
            style={[styles.contentInput, { color: colors.textPrimary, fontSize }]}
            value={content}
            onChangeText={(text) => { setContent(text); setHasChanges(true); }}
            onBlur={() => {
              if (content !== history[historyIndex]) {
                saveToHistory(content);
              }
            }}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            placeholder="Start typing..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </ScrollView>

        {/* Status Bar */}
        <View style={[styles.statusBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.statusLeft}>
            <Ionicons
              name={hasChanges ? 'ellipse' : 'checkmark-circle'}
              size={12}
              color={hasChanges ? '#F59E0B' : colors.success}
            />
            <Text style={[styles.statusText, { color: colors.textTertiary }]}>
              {hasChanges ? 'Unsaved' : 'Saved'}
            </Text>
          </View>
          <View style={styles.statusRight}>
            <Text style={[styles.statusText, { color: colors.textTertiary }]}>
              {content.length} chars • {content.split(/\s+/).filter(Boolean).length} words
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ═══ MODALS ═══ */}

      {/* AI Assistant Modal */}
      <Modal visible={showAIAssistant} transparent animationType="slide" onRequestClose={() => setShowAIAssistant(false)}>
        <View style={[styles.modalFull, { backgroundColor: colors.background }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowAIAssistant(false)} style={styles.headerBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>AI Assistant</Text>
              <View style={{ width: 44 }} />
            </View>
            
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              <View style={[styles.aiInputBox, { backgroundColor: colors.surface, ...shadows.sm }]}>
                <TextInput
                  style={[styles.aiInput, { color: colors.textPrimary }]}
                  placeholder="Ask anything about this document..."
                  placeholderTextColor={colors.textTertiary}
                  value={aiQuery}
                  onChangeText={setAiQuery}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.aiSendBtn, { backgroundColor: colors.primary }]}
                  onPress={askAI}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="send" size={18} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={styles.aiSuggestions}>
                {['Summarize this', 'Extract key points', 'Translate to Spanish', 'Find all dates'].map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.aiSuggestion, { backgroundColor: colors.surface }]}
                    onPress={() => setAiQuery(s)}
                  >
                    <Text style={[styles.aiSuggestionText, { color: colors.textSecondary }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {aiResponse && (
                <View style={[styles.aiResponseBox, { backgroundColor: colors.surface, ...shadows.sm }]}>
                  <View style={styles.aiResponseHeader}>
                    <Ionicons name="sparkles" size={18} color={colors.primary} />
                    <Text style={[styles.aiResponseTitle, { color: colors.primary }]}>AI Response</Text>
                  </View>
                  <Text style={[styles.aiResponseText, { color: colors.textPrimary }]} selectable>
                    {aiResponse}
                  </Text>
                  <TouchableOpacity
                    style={[styles.aiApplyBtn, { backgroundColor: colors.primary }]}
                    onPress={applyAIResponse}
                  >
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={styles.aiApplyBtnText}>Insert into Document</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Page Manager Modal */}
      <Modal visible={showPageManager} transparent animationType="slide" onRequestClose={() => setShowPageManager(false)}>
        <View style={[styles.modalFull, { backgroundColor: colors.background }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowPageManager(false)} style={styles.headerBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Manage Pages</Text>
              <TouchableOpacity onPress={addPage} style={styles.headerBtn}>
                <Ionicons name="add" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              {pages.map((page, index) => (
                <View key={index} style={[styles.pageCard, { backgroundColor: colors.surface, ...shadows.sm }]}>
                  <View style={styles.pageCardLeft}>
                    {page.thumbnail ? (
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${page.thumbnail}` }}
                        style={styles.pageCardThumb}
                      />
                    ) : (
                      <View style={[styles.pageCardThumbPlaceholder, { backgroundColor: colors.surfaceHighlight }]}>
                        <Text style={[styles.pageCardNum, { color: colors.textTertiary }]}>{index + 1}</Text>
                      </View>
                    )}
                    <View style={styles.pageCardInfo}>
                      <Text style={[styles.pageCardTitle, { color: colors.textPrimary }]}>Page {index + 1}</Text>
                      <Text style={[styles.pageCardChars, { color: colors.textTertiary }]}>
                        {page.content?.length || 0} characters
                      </Text>
                    </View>
                  </View>
                  <View style={styles.pageCardActions}>
                    <TouchableOpacity
                      style={styles.pageActionBtn}
                      onPress={() => hidePage(index)}
                    >
                      <Ionicons
                        name={hiddenPages.has(index) ? 'eye' : 'eye-off'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    {index < pages.length - 1 && (
                      <TouchableOpacity
                        style={styles.pageActionBtn}
                        onPress={() => mergePage(index)}
                      >
                        <Ionicons name="git-merge-outline" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.pageActionBtn}
                      onPress={() => deletePage(index)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Watermark Modal */}
      <Modal visible={showWatermark} transparent animationType="fade" onRequestClose={() => setShowWatermark(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowWatermark(false)}>
          <View style={[styles.watermarkModal, { backgroundColor: colors.surface, ...shadows.lg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Watermark</Text>
            <TextInput
              style={[styles.watermarkInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Watermark text"
              placeholderTextColor={colors.textTertiary}
              value={watermarkText}
              onChangeText={setWatermarkText}
            />
            <View style={styles.opacityRow}>
              <Text style={[styles.opacityLabel, { color: colors.textSecondary }]}>Opacity: {Math.round(watermarkOpacity * 100)}%</Text>
            </View>
            <TouchableOpacity
              style={[styles.watermarkApplyBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                insertFormatting(`\n[WATERMARK: ${watermarkText}]\n`);
                setShowWatermark(false);
              }}
            >
              <Text style={styles.watermarkApplyText}>Apply Watermark</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Cloud Sync Modal */}
      <Modal visible={showCloudSync} transparent animationType="slide" onRequestClose={() => setShowCloudSync(false)}>
        <View style={[styles.modalFull, { backgroundColor: colors.background }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowCloudSync(false)} style={styles.headerBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Cloud Storage</Text>
              <View style={{ width: 44 }} />
            </View>
            
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              <Text style={[styles.cloudSubtitle, { color: colors.textSecondary }]}>
                Connect your cloud storage to sync documents
              </Text>
              
              {[
                { id: 'google_drive', name: 'Google Drive', icon: 'logo-google', color: '#4285F4' },
                { id: 'dropbox', name: 'Dropbox', icon: 'cloud-outline', color: '#0061FF' },
                { id: 'onedrive', name: 'OneDrive', icon: 'logo-microsoft', color: '#0078D4' },
                { id: 'box', name: 'Box', icon: 'cube-outline', color: '#0061D5' },
                { id: 'icloud', name: 'iCloud', icon: 'logo-apple', color: '#3693F3' },
              ].map(provider => (
                <TouchableOpacity
                  key={provider.id}
                  style={[styles.cloudProvider, { backgroundColor: colors.surface, ...shadows.sm }]}
                  onPress={() => Alert.alert('Connect', `Connect to ${provider.name}?`)}
                >
                  <View style={[styles.cloudIcon, { backgroundColor: provider.color + '20' }]}>
                    <Ionicons name={provider.icon as any} size={24} color={provider.color} />
                  </View>
                  <Text style={[styles.cloudName, { color: colors.textPrimary }]}>{provider.name}</Text>
                  <View style={[styles.connectBadge, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[styles.connectBadgeText, { color: colors.textSecondary }]}>Connect</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
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
    paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 0.5,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '600' },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  undoBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  titleSection: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  titleInput: { fontSize: 18, fontWeight: '700' },

  categoryTabs: { flexDirection: 'row' },
  categoryTabsContent: { paddingHorizontal: 8, paddingVertical: 8, gap: 4 },
  categoryTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  categoryTabText: { fontSize: 12, fontWeight: '600' },

  toolsRow: { borderBottomWidth: 0.5 },
  toolsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 16 },
  toolBtn: { alignItems: 'center', gap: 4, width: 56 },
  toolIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontSize: 10, fontWeight: '500' },

  pagesStrip: { height: 70, paddingVertical: 8 },
  pagesStripContent: { paddingHorizontal: 12, gap: 8 },
  pageThumb: { width: 40, height: 54, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  pageThumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  pageThumbPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  pageThumbNum: { fontSize: 14, fontWeight: '700' },
  hiddenBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: 2 },

  editorScroll: { flex: 1 },
  editorContent: { padding: 16, paddingBottom: 100 },
  contentInput: { lineHeight: 26, minHeight: 300 },

  statusBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusText: { fontSize: 11 },

  // Modals
  modalFull: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 0.5,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

  // AI Assistant
  aiInputBox: { borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  aiInput: { flex: 1, fontSize: 15, maxHeight: 100, minHeight: 44 },
  aiSendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  aiSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  aiSuggestion: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  aiSuggestionText: { fontSize: 12 },
  aiResponseBox: { borderRadius: 16, padding: 16, marginTop: 20 },
  aiResponseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiResponseTitle: { fontSize: 14, fontWeight: '600' },
  aiResponseText: { fontSize: 14, lineHeight: 22 },
  aiApplyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, marginTop: 16 },
  aiApplyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Page Manager
  pageCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, marginBottom: 10 },
  pageCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageCardThumb: { width: 40, height: 54, borderRadius: 6 },
  pageCardThumbPlaceholder: { width: 40, height: 54, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  pageCardNum: { fontSize: 16, fontWeight: '700' },
  pageCardInfo: {},
  pageCardTitle: { fontSize: 14, fontWeight: '600' },
  pageCardChars: { fontSize: 11, marginTop: 2 },
  pageCardActions: { flexDirection: 'row', gap: 8 },
  pageActionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Watermark
  watermarkModal: { width: '85%', borderRadius: 20, padding: 24 },
  watermarkInput: { borderRadius: 12, padding: 14, fontSize: 15, marginVertical: 16 },
  opacityRow: { marginBottom: 16 },
  opacityLabel: { fontSize: 13 },
  watermarkApplyBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  watermarkApplyText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Cloud Sync
  cloudSubtitle: { fontSize: 14, marginBottom: 20 },
  cloudProvider: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, marginBottom: 10 },
  cloudIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cloudName: { flex: 1, marginLeft: 14, fontSize: 15, fontWeight: '600' },
  connectBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  connectBadgeText: { fontSize: 12, fontWeight: '600' },
});
