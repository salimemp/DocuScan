import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
  Image, Alert, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

interface MathSolverModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MathSolverModal: React.FC<MathSolverModalProps> = ({ visible, onClose }) => {
  const { colors, shadows } = useTheme();
  const { t } = useLanguage();
  
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [equation, setEquation] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      setImageUri(uri);
      setImageBase64(compressed.base64 || null);
      setSolution(null);
      setError(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to process image');
    }
  };

  const handleSolve = async () => {
    if (mode === 'text' && !equation.trim()) {
      Alert.alert('Error', 'Please enter an equation');
      return;
    }
    if (mode === 'image' && !imageBase64) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    setLoading(true);
    setError(null);
    setSolution(null);

    try {
      const body: any = {};
      if (mode === 'text') {
        body.equation = equation.trim();
      } else {
        body.image_base64 = imageBase64;
      }

      const res = await fetch(`${BACKEND_URL}/api/math/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to solve');
      }

      const data = await res.json();
      setSolution(data.solution);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setEquation('');
    setImageUri(null);
    setImageBase64(null);
    setSolution(null);
    setError(null);
  };

  const exampleEquations = [
    '2x + 5 = 15',
    'x² - 4x + 3 = 0',
    '∫ x² dx',
    'sin(30°)',
    '√144 + 5²',
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {t('mathSolver')}
            </Text>
            <TouchableOpacity onPress={handleClear} style={styles.headerBtn}>
              <Ionicons name="refresh" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Mode Selector */}
              <View style={[styles.modeSelector, { backgroundColor: colors.surfaceHighlight }]}>
                <TouchableOpacity
                  style={[
                    styles.modeBtn,
                    mode === 'text' && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setMode('text')}
                >
                  <Ionicons 
                    name="calculator-outline" 
                    size={20} 
                    color={mode === 'text' ? '#FFF' : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.modeBtnText,
                    { color: mode === 'text' ? '#FFF' : colors.textSecondary }
                  ]}>
                    {t('typeEquation')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeBtn,
                    mode === 'image' && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setMode('image')}
                >
                  <Ionicons 
                    name="camera-outline" 
                    size={20} 
                    color={mode === 'image' ? '#FFF' : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.modeBtnText,
                    { color: mode === 'image' ? '#FFF' : colors.textSecondary }
                  ]}>
                    {t('scanProblem')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Input Area */}
              {mode === 'text' ? (
                <View style={styles.inputSection}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    {t('enterEquation')}
                  </Text>
                  <TextInput
                    style={[
                      styles.equationInput,
                      { 
                        backgroundColor: colors.surface, 
                        color: colors.textPrimary,
                        borderColor: colors.border,
                        ...shadows.sm,
                      }
                    ]}
                    placeholder="e.g., 2x + 5 = 15"
                    placeholderTextColor={colors.textTertiary}
                    value={equation}
                    onChangeText={setEquation}
                    multiline
                    numberOfLines={3}
                  />
                  
                  {/* Example Equations */}
                  <Text style={[styles.examplesLabel, { color: colors.textTertiary }]}>
                    {t('quickExamples')}
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.examplesRow}
                  >
                    {exampleEquations.map((eq, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.exampleChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => setEquation(eq)}
                      >
                        <Text style={[styles.exampleText, { color: colors.textPrimary }]}>{eq}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.inputSection}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    {t('captureOrSelect')}
                  </Text>
                  
                  {imageUri ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={[styles.removeImageBtn, { backgroundColor: colors.error }]}
                        onPress={() => { setImageUri(null); setImageBase64(null); }}
                      >
                        <Ionicons name="close" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePickerRow}>
                      <TouchableOpacity
                        style={[styles.imagePickerBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
                        onPress={handleTakePhoto}
                      >
                        <View style={[styles.imagePickerIcon, { backgroundColor: colors.primary + '18' }]}>
                          <Ionicons name="camera" size={28} color={colors.primary} />
                        </View>
                        <Text style={[styles.imagePickerText, { color: colors.textPrimary }]}>
                          {t('takePhoto')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.imagePickerBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
                        onPress={handlePickImage}
                      >
                        <View style={[styles.imagePickerIcon, { backgroundColor: '#8B5CF6' + '18' }]}>
                          <Ionicons name="images" size={28} color="#8B5CF6" />
                        </View>
                        <Text style={[styles.imagePickerText, { color: colors.textPrimary }]}>
                          {t('gallery')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Solve Button */}
              <TouchableOpacity
                style={[
                  styles.solveBtn,
                  { backgroundColor: colors.primary },
                  loading && { opacity: 0.7 },
                ]}
                onPress={handleSolve}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color="#FFF" size="small" />
                    <Text style={styles.solveBtnText}>{t('solving')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#FFF" />
                    <Text style={styles.solveBtnText}>{t('solveProblem')}</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Error */}
              {error && (
                <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
                  <Ionicons name="alert-circle" size={20} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              )}

              {/* Solution */}
              {solution && (
                <View style={[styles.solutionBox, { backgroundColor: colors.surface, ...shadows.md }]}>
                  <View style={styles.solutionHeader}>
                    <Ionicons name="checkmark-circle" size={22} color="#059669" />
                    <Text style={[styles.solutionTitle, { color: colors.textPrimary }]}>
                      {t('solution')}
                    </Text>
                  </View>
                  <Text style={[styles.solutionText, { color: colors.textPrimary }]} selectable>
                    {solution}
                  </Text>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scrollContent: { padding: 20 },
  
  modeSelector: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modeBtnText: { fontSize: 14, fontWeight: '600' },

  inputSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  equationInput: {
    borderRadius: 14,
    padding: 16,
    fontSize: 18,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  
  examplesLabel: { fontSize: 12, marginTop: 16, marginBottom: 10 },
  examplesRow: { gap: 8, paddingVertical: 4 },
  exampleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  exampleText: { fontSize: 14, fontWeight: '500' },

  imagePickerRow: { flexDirection: 'row', gap: 12 },
  imagePickerBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    gap: 12,
  },
  imagePickerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: { fontSize: 14, fontWeight: '600' },

  imagePreviewContainer: { position: 'relative' },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    resizeMode: 'contain',
    backgroundColor: '#F3F4F6',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  solveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
  },
  solveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  errorText: { flex: 1, fontSize: 14 },

  solutionBox: {
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  solutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  solutionTitle: { fontSize: 16, fontWeight: '700' },
  solutionText: { fontSize: 15, lineHeight: 24 },
});

export default MathSolverModal;
