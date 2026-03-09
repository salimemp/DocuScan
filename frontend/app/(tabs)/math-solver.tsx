import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import * as ImagePicker from 'expo-image-picker';

export default function MathSolverScreen() {
  const { colors, shadows } = useTheme();
  const [equation, setEquation] = useState('');
  const [solution, setSolution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const solveMathProblem = async (imageBase64?: string, textEquation?: string) => {
    if (!imageBase64 && !textEquation?.trim()) {
      Alert.alert('Error', 'Please provide either an equation or select an image');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/math/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          equation: textEquation,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: any = await response.json();
      setSolution(result);
    } catch (error) {
      console.error('Math solver error:', error);
      Alert.alert('Error', 'Failed to solve math problem. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTextSolve = () => {
    solveMathProblem(undefined, equation);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to select images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      solveMathProblem(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      solveMathProblem(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const clearAll = () => {
    setEquation('');
    setSolution(null);
    setSelectedImage(null);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Math Solver</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Solve math problems from text or images using AI
        </Text>
      </View>

      {/* Text Input Section */}
      <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          <Ionicons name="create-outline" size={20} color={colors.primary} /> Type Equation
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Enter math equation (e.g., 2x + 5 = 15)"
          placeholderTextColor={colors.textTertiary}
          value={equation}
          onChangeText={setEquation}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            !equation.trim() && styles.buttonDisabled,
          ]}
          onPress={handleTextSolve}
          disabled={!equation.trim() || loading}
        >
          <Ionicons name="calculator" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Solve Equation</Text>
        </TouchableOpacity>
      </View>

      {/* Image Input Section */}
      <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          <Ionicons name="camera-outline" size={20} color={colors.primary} /> Photo Math
        </Text>
        <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
          Take a photo or select an image of a math problem
        </Text>
        
        <View style={styles.imageButtons}>
          <TouchableOpacity
            style={[styles.imageButton, { backgroundColor: colors.primary }]}
            onPress={takePhoto}
            disabled={loading}
          >
            <Ionicons name="camera" size={24} color="#FFFFFF" />
            <Text style={styles.imageButtonText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.imageButton, { backgroundColor: colors.secondary }]}
            onPress={pickImage}
            disabled={loading}
          >
            <Ionicons name="images" size={24} color="#FFFFFF" />
            <Text style={styles.imageButtonText}>Select Image</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading State */}
      {loading && (
        <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Solving math problem...
            </Text>
          </View>
        </View>
      )}

      {/* Solution Display */}
      {solution && (
        <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
          <View style={styles.solutionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} /> Solution
            </Text>
            <TouchableOpacity onPress={clearAll} style={styles.clearButton}>
              <Ionicons name="refresh" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.solutionCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.solutionText, { color: colors.text }]}>
              {solution.solution}
            </Text>
          </View>
          
          <View style={styles.solutionMeta}>
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              Input: {solution.input_type === 'image' ? 'Photo' : 'Text'}
            </Text>
            {solution.original_equation && solution.input_type === 'text' && (
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                Equation: {solution.original_equation}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Quick Examples */}
      <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          <Ionicons name="bulb-outline" size={20} color={colors.primary} /> Quick Examples
        </Text>
        <View style={styles.examplesContainer}>
          {[
            '2x + 5 = 15',
            'x² - 4x + 4 = 0',
            '∫ x² dx',
            'lim(x→0) sin(x)/x',
          ].map((example, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.exampleChip, { backgroundColor: colors.background }]}
              onPress={() => setEquation(example)}
            >
              <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                {example}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  imageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  solutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButton: {
    padding: 8,
  },
  solutionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  solutionText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  solutionMeta: {
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  examplesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exampleText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});