import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform,
  ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addScanPage, getScanPages, clearScanData, removeScanPage, getScanPageCount } from '../utils/scanStore';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { MathSolverModal } from '../components/MathSolverModal';

export default function ScanScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pages, setPages] = useState(getScanPages());
  const [showMathSolver, setShowMathSolver] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const refreshPages = () => setPages(getScanPages());

  const processImage = async (uri: string) => {
    // Compress main image for AI analysis (max 1024px wide)
    const compressed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    // Generate small thumbnail for storage (300px wide)
    const thumbnail = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 300 } }],
      { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return { base64: compressed.base64!, thumbnailBase64: thumbnail.base64!, uri };
  };

  const addPage = async (uri: string) => {
    setIsProcessing(true);
    try {
      const pageData = await processImage(uri);
      addScanPage(pageData);
      refreshPages();
    } catch {
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isProcessing) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) await addPage(photo.uri);
    } catch {
      Alert.alert('Error', 'Failed to capture photo.');
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setIsProcessing(true);
      try {
        for (const asset of result.assets) {
          if (asset.uri) {
            const pageData = await processImage(asset.uri);
            addScanPage(pageData);
          }
        }
        refreshPages();
      } catch {
        Alert.alert('Error', 'Failed to process some images.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleRemovePage = (index: number) => {
    Alert.alert('Remove Page', `Remove page ${index + 1}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeScanPage(index);
          refreshPages();
        },
      },
    ]);
  };

  const handleContinue = () => {
    if (pages.length === 0) {
      Alert.alert('No Pages', 'Please scan at least one page.');
      return;
    }
    router.push('/preview');
  };

  const handleCancel = () => {
    if (pages.length > 0) {
      Alert.alert('Discard Scan?', 'All scanned pages will be lost.', [
        { text: 'Keep Scanning', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            clearScanData();
            router.back();
          },
        },
      ]);
    } else {
      router.back();
    }
  };

  // Permission not yet determined
  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  // Permission denied — show request UI
  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: '#0A0A0A' }]}>
        <SafeAreaView style={styles.permissionSafe}>
          <View style={styles.permissionContent}>
            <View style={styles.permissionIconWrap}>
              <Ionicons name="camera-outline" size={56} color="#FFFFFF" />
            </View>
            <Text style={styles.permissionTitle}>{t('cameraAccess')}</Text>
            <Text style={styles.permissionSubtitle}>
              {t('cameraPermissionDesc')}
            </Text>
            <TouchableOpacity
              testID="grant-camera-btn"
              style={[styles.grantBtn, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={20} color="#FFF" />
              <Text style={styles.grantBtnText}>{t('enableCamera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="cancel-permission-btn"
              style={styles.cancelPermBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelPermText}>{t('maybeLater')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const pageCount = pages.length;

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        ref={cameraRef}
      />

      {/* Dark overlay — top & bottom bands */}
      <View style={styles.overlayTop} />
      <View style={styles.overlayBottom} />
      <View style={styles.overlaySideLeft} />
      <View style={styles.overlaySideRight} />

      {/* Scan frame corners */}
      <View style={styles.frameWrap} pointerEvents="none">
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>

      {/* Top Controls */}
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity
            testID="scan-close-btn"
            style={styles.ctrlBtn}
            onPress={handleCancel}
            activeOpacity={0.8}
            accessibilityLabel="Close scanner"
          >
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.topCenter}>
            <Text style={styles.topTitle}>{t('scanDocument')}</Text>
            {pageCount > 0 && (
              <View style={[styles.pageCountBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.pageCountText}>{pageCount} {t('pages')}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            testID="scan-flash-btn"
            style={styles.ctrlBtn}
            onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}
            activeOpacity={0.8}
            accessibilityLabel="Toggle flash"
          >
            <Ionicons
              name={flash === 'on' ? 'flash' : 'flash-off'}
              size={22}
              color={flash === 'on' ? '#FBBF24' : '#FFF'}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Center instruction */}
      <View style={styles.centerInstruction}>
        <Text style={styles.instructionText}>
          {pageCount === 0 ? t('alignDocument') : t('addMorePagesOrContinue')}
        </Text>
      </View>

      {/* Page thumbnails strip */}
      {pageCount > 0 && (
        <View style={styles.thumbStrip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbScrollContent}
          >
            {pages.map((page, index) => (
              <TouchableOpacity
                key={index}
                testID={`page-thumb-${index}`}
                style={styles.thumbContainer}
                onPress={() => handleRemovePage(index)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: `data:image/jpeg;base64,${page.thumbnailBase64}` }}
                  style={styles.thumbImage}
                />
                <View style={styles.thumbBadge}>
                  <Text style={styles.thumbBadgeText}>{index + 1}</Text>
                </View>
                <View style={styles.thumbRemove}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bottom Controls */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.bottomBar}>
          {/* Gallery */}
          <TouchableOpacity
            testID="gallery-import-btn"
            style={styles.sideAction}
            onPress={pickFromGallery}
            activeOpacity={0.8}
            accessibilityLabel="Import from gallery"
          >
            <View style={styles.sideActionIcon}>
              <Ionicons name="images-outline" size={26} color="#FFF" />
            </View>
            <Text style={styles.sideActionLabel}>{t('gallery')}</Text>
          </TouchableOpacity>

          {/* Shutter */}
          <TouchableOpacity
            testID="shutter-btn"
            style={[styles.shutterBtn, isProcessing && { opacity: 0.5 }]}
            onPress={takePicture}
            disabled={isProcessing}
            activeOpacity={0.85}
            accessibilityLabel="Take photo"
          >
            {isProcessing
              ? <ActivityIndicator color="#FFF" size="small" />
              : <View style={styles.shutterInner} />}
          </TouchableOpacity>

          {/* Continue or Flip */}
          {pageCount > 0 ? (
            <TouchableOpacity
              testID="continue-btn"
              style={styles.sideAction}
              onPress={handleContinue}
              activeOpacity={0.8}
              accessibilityLabel="Continue to preview"
            >
              <View style={[styles.sideActionIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="arrow-forward" size={26} color="#FFF" />
              </View>
              <Text style={styles.sideActionLabel}>{t('continue')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID="flip-camera-btn"
              style={styles.sideAction}
              onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
              activeOpacity={0.8}
              accessibilityLabel="Flip camera"
            >
              <View style={styles.sideActionIcon}>
                <Ionicons name="camera-reverse-outline" size={26} color="#FFF" />
              </View>
              <Text style={styles.sideActionLabel}>{t('flip')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Processing overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.processingText}>Processing image...</Text>
            <Text style={styles.processingSubtext}>Preparing page {pageCount + 1}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const FRAME_W = 280;
const FRAME_H = 370;
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Overlay bands that darken outside the scan frame
  overlayTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '20%',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '25%',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlaySideLeft: {
    position: 'absolute',
    top: '20%', bottom: '25%',
    left: 0,
    width: '10%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlaySideRight: {
    position: 'absolute',
    top: '20%', bottom: '25%',
    right: 0,
    width: '10%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // Scan frame corners
  frameWrap: {
    position: 'absolute',
    alignSelf: 'center',
    top: '20%',
    width: FRAME_W,
    height: FRAME_H,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 3,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 3,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 3,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 3,
  },

  // Top bar
  topSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ctrlBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  topCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  pageCountBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  pageCountText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // Center instruction
  centerInstruction: {
    position: 'absolute',
    bottom: '28%',
    alignSelf: 'center',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    textAlign: 'center',
  },

  // Thumbnail strip
  thumbStrip: {
    position: 'absolute',
    bottom: '26%',
    left: 0,
    right: 0,
    height: 80,
  },
  thumbScrollContent: { paddingHorizontal: 20, gap: 10 },
  thumbContainer: {
    width: 56, height: 72, borderRadius: 8,
    borderWidth: 2, borderColor: '#FFF',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  thumbBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  thumbRemove: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#FFF', borderRadius: 10,
  },

  // Bottom bar
  bottomSafe: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 8 : 20,
    paddingTop: 16,
  },
  sideAction: { alignItems: 'center', gap: 6, width: 72 },
  sideActionIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  sideActionLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500' },
  shutterBtn: {
    width: 78, height: 78, borderRadius: 39,
    borderWidth: 4, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  shutterInner: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },

  // Processing
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingCard: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 14,
  },
  processingText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  processingSubtext: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },

  // Permission
  permissionSafe: { flex: 1 },
  permissionContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, gap: 16,
  },
  permissionIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  permissionTitle: { color: '#FFF', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  permissionSubtitle: {
    color: 'rgba(255,255,255,0.65)', fontSize: 15,
    textAlign: 'center', lineHeight: 22,
  },
  grantBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 36, paddingVertical: 15,
    borderRadius: 16, marginTop: 8,
  },
  grantBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelPermBtn: { paddingVertical: 12, paddingHorizontal: 24 },
  cancelPermText: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },
});
