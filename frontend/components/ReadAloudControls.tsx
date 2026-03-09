import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

interface ReadAloudControlsProps {
  text: string;
  visible: boolean;
  onClose: () => void;
}

export const ReadAloudControls: React.FC<ReadAloudControlsProps> = ({ text, visible, onClose }) => {
  const { colors, shadows } = useTheme();
  const { t } = useLanguage();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [currentPosition, setCurrentPosition] = useState(0);

  const speedOptions = [
    { label: '0.5x', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: '1x', value: 1.0 },
    { label: '1.25x', value: 1.25 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2.0 },
  ];

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      handleStop();
    }
  }, [visible]);

  const handlePlay = useCallback(async () => {
    if (!text) return;

    if (isPaused) {
      // Resume is not directly supported, so we restart
      await Speech.stop();
    }

    setIsPlaying(true);
    setIsPaused(false);

    Speech.speak(text, {
      rate: speed,
      onStart: () => {
        setIsPlaying(true);
      },
      onDone: () => {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentPosition(0);
      },
      onStopped: () => {
        setIsPlaying(false);
      },
      onError: () => {
        setIsPlaying(false);
        setIsPaused(false);
      },
    });
  }, [text, speed, isPaused]);

  const handlePause = useCallback(async () => {
    await Speech.stop();
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  const handleStop = useCallback(async () => {
    await Speech.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentPosition(0);
  }, []);

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (isPlaying) {
      // Restart with new speed
      Speech.stop();
      setTimeout(() => {
        Speech.speak(text, {
          rate: newSpeed,
          onDone: () => {
            setIsPlaying(false);
            setIsPaused(false);
          },
        });
      }, 100);
    }
  };

  const handleClose = () => {
    handleStop();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <View 
          style={[styles.container, { backgroundColor: colors.surface, ...shadows.lg }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="volume-high" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {t('readAloud')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Playback Controls */}
          <View style={styles.controlsContainer}>
            <View style={styles.mainControls}>
              {/* Stop */}
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.surfaceHighlight }]}
                onPress={handleStop}
              >
                <Ionicons name="stop" size={24} color={colors.textPrimary} />
              </TouchableOpacity>

              {/* Play/Pause */}
              <TouchableOpacity
                style={[styles.playBtn, { backgroundColor: colors.primary }]}
                onPress={isPlaying ? handlePause : handlePlay}
              >
                <Ionicons 
                  name={isPlaying ? 'pause' : 'play'} 
                  size={32} 
                  color="#FFF" 
                />
              </TouchableOpacity>

              {/* Restart */}
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.surfaceHighlight }]}
                onPress={() => {
                  handleStop();
                  setTimeout(handlePlay, 100);
                }}
              >
                <Ionicons name="refresh" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Status */}
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: isPlaying ? '#059669' : isPaused ? '#F59E0B' : colors.textTertiary }]} />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {isPlaying ? t('playing') : isPaused ? t('paused') : t('stopped')}
              </Text>
            </View>
          </View>

          {/* Speed Control */}
          <View style={styles.speedSection}>
            <Text style={[styles.speedLabel, { color: colors.textSecondary }]}>
              {t('playbackSpeed')}
            </Text>
            <View style={styles.speedButtons}>
              {speedOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.speedBtn,
                    { backgroundColor: colors.surfaceHighlight },
                    speed === option.value && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => handleSpeedChange(option.value)}
                >
                  <Text style={[
                    styles.speedBtnText,
                    { color: speed === option.value ? '#FFF' : colors.textPrimary },
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Text Preview */}
          <View style={[styles.previewSection, { backgroundColor: colors.surfaceHighlight }]}>
            <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>
              {t('textToRead')}
            </Text>
            <Text 
              style={[styles.previewText, { color: colors.textPrimary }]} 
              numberOfLines={4}
            >
              {text || t('noTextToRead')}
            </Text>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

// Inline button to trigger read aloud
interface ReadAloudButtonProps {
  onPress: () => void;
}

export const ReadAloudButton: React.FC<ReadAloudButtonProps> = ({ onPress }) => {
  const { colors, shadows } = useTheme();
  const { t } = useLanguage();

  return (
    <TouchableOpacity
      style={[styles.readAloudBtn, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}
      onPress={onPress}
    >
      <Ionicons name="volume-high-outline" size={20} color="#8B5CF6" />
      <Text style={[styles.readAloudBtnText, { color: colors.textPrimary }]}>
        {t('readAloud')}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  controlsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },

  speedSection: {
    marginBottom: 20,
  },
  speedLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  speedButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  speedBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  speedBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  previewSection: {
    borderRadius: 14,
    padding: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Inline button styles
  readAloudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  readAloudBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});

export default ReadAloudControls;
