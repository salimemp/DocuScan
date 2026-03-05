import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  PanResponder, Dimensions, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import Svg, { Path, G } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_WIDTH = SCREEN_WIDTH - 80;
const CANVAS_HEIGHT = 200;

interface SignatureCanvasProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureData: { name: string; image_base64: string }) => void;
}

export function SignatureCanvas({ visible, onClose, onSave }: SignatureCanvasProps) {
  const { colors, shadows } = useTheme();
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [signatureName, setSignatureName] = useState('');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M${locationX.toFixed(2)},${locationY.toFixed(2)}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(prev => `${prev} L${locationX.toFixed(2)},${locationY.toFixed(2)}`);
      },
      onPanResponderRelease: () => {
        if (currentPath) {
          setPaths(prev => [...prev, currentPath]);
          setCurrentPath('');
        }
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleSave = () => {
    if (paths.length === 0) {
      Alert.alert('Empty Signature', 'Please draw your signature first.');
      return;
    }
    if (!signatureName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for this signature.');
      return;
    }

    // Generate SVG string
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
      <g fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
        ${paths.map(p => `<path d="${p}"/>`).join('')}
      </g>
    </svg>`;
    
    const base64 = Buffer.from(svgContent).toString('base64');
    
    onSave({
      name: signatureName.trim(),
      image_base64: `data:image/svg+xml;base64,${base64}`,
    });

    // Reset
    setPaths([]);
    setCurrentPath('');
    setSignatureName('');
    onClose();
  };

  const COLORS = ['#000000', '#1E40AF', '#7C3AED', '#059669', '#DC2626'];
  const WIDTHS = [2, 3, 4, 5];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View 
          style={[styles.container, { backgroundColor: colors.surface, ...shadows.lg }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Draw Signature</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <TextInput
            style={[styles.nameInput, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Signature Name (e.g., John Doe)"
            placeholderTextColor={colors.textTertiary}
            value={signatureName}
            onChangeText={setSignatureName}
          />

          {/* Canvas */}
          <View 
            style={[styles.canvas, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}
            {...panResponder.panHandlers}
          >
            <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
              <G fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                {paths.map((path, index) => (
                  <Path key={index} d={path} />
                ))}
                {currentPath && <Path d={currentPath} />}
              </G>
            </Svg>
            {paths.length === 0 && !currentPath && (
              <View style={styles.canvasPlaceholder}>
                <Text style={styles.canvasPlaceholderText}>Sign here</Text>
              </View>
            )}
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {/* Colors */}
            <View style={styles.controlRow}>
              <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>Color:</Text>
              <View style={styles.colorRow}>
                {COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorBtn,
                      { backgroundColor: color },
                      strokeColor === color && styles.colorBtnSelected,
                    ]}
                    onPress={() => setStrokeColor(color)}
                  />
                ))}
              </View>
            </View>

            {/* Stroke Width */}
            <View style={styles.controlRow}>
              <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>Width:</Text>
              <View style={styles.widthRow}>
                {WIDTHS.map(w => (
                  <TouchableOpacity
                    key={w}
                    style={[
                      styles.widthBtn,
                      { backgroundColor: strokeWidth === w ? colors.primary : colors.surfaceHighlight },
                    ]}
                    onPress={() => setStrokeWidth(w)}
                  >
                    <Text style={[
                      styles.widthBtnText,
                      { color: strokeWidth === w ? '#FFF' : colors.textPrimary },
                    ]}>{w}px</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border }]}
              onPress={handleClear}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border }]}
              onPress={handleUndo}
              disabled={paths.length === 0}
            >
              <Ionicons name="arrow-undo" size={18} color={paths.length === 0 ? colors.textTertiary : colors.textSecondary} />
              <Text style={[styles.actionBtnText, { color: paths.length === 0 ? colors.textTertiary : colors.textSecondary }]}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
            >
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// Simple buffer polyfill for React Native
const Buffer = {
  from: (str: string) => ({
    toString: (encoding: string) => {
      if (encoding === 'base64') {
        // Simple base64 encoding
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;
        while (i < str.length) {
          const a = str.charCodeAt(i++);
          const b = i < str.length ? str.charCodeAt(i++) : 0;
          const c = i < str.length ? str.charCodeAt(i++) : 0;
          
          const triplet = (a << 16) | (b << 8) | c;
          
          result += chars[(triplet >> 18) & 0x3F];
          result += chars[(triplet >> 12) & 0x3F];
          result += i > str.length + 1 ? '=' : chars[(triplet >> 6) & 0x3F];
          result += i > str.length ? '=' : chars[triplet & 0x3F];
        }
        return result;
      }
      return str;
    },
  }),
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  nameInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 16,
  },
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  canvasPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasPlaceholderText: {
    color: '#CBD5E1',
    fontSize: 18,
    fontWeight: '500',
  },
  controls: {
    marginTop: 16,
    gap: 12,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 50,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorBtnSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  widthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  widthBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  widthBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
