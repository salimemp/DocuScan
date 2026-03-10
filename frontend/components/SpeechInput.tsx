/**
 * SpeechInput Component
 * A reusable text input with speech-to-text capability
 * Provides microphone button for voice input with visual feedback
 */
import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import haptics from '../utils/haptics';

interface SpeechInputProps extends TextInputProps {
  containerStyle?: object;
  inputStyle?: object;
  iconColor?: string;
  activeColor?: string;
  showClearButton?: boolean;
  onClear?: () => void;
  leftIcon?: string;
  leftIconColor?: string;
  colors: {
    surface: string;
    textPrimary: string;
    textTertiary: string;
    primary: string;
    border: string;
  };
  shadows?: object;
}

export const SpeechInput: React.FC<SpeechInputProps> = ({
  value,
  onChangeText,
  containerStyle,
  inputStyle,
  iconColor,
  activeColor,
  showClearButton = true,
  onClear,
  leftIcon,
  leftIconColor,
  colors,
  shadows = {},
  placeholder,
  ...textInputProps
}) => {
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  
  // Track mounted state to prevent memory leaks
  const isMountedRef = useRef(true);
  
  // Speech recognition hook
  const {
    isListening,
    isAvailable,
    transcript,
    partialTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    locale: 'en-US',
    autoParseCommands: false,
  });

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Stop any running animations
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      // Reset animation value
      pulseAnim.setValue(1);
    };
  }, [pulseAnim]);

  // Pulse animation when listening
  useEffect(() => {
    if (isListening) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animationRef.current = animation;
      animation.start();
    } else {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      // Safely reset to 1
      if (isMountedRef.current) {
        pulseAnim.setValue(1);
      }
    }
  }, [isListening, pulseAnim]);

  // Update text when transcript changes
  useEffect(() => {
    if (transcript && onChangeText && isMountedRef.current) {
      onChangeText(transcript);
      resetTranscript();
    }
  }, [transcript, onChangeText, resetTranscript]);

  const handleMicPress = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    if (isListening) {
      await stopListening();
    } else {
      await haptics.selection();
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleClear = useCallback(() => {
    if (onChangeText) {
      onChangeText('');
    }
    if (onClear) {
      onClear();
    }
    resetTranscript();
  }, [onChangeText, onClear, resetTranscript]);

  const displayValue = isListening && partialTranscript 
    ? partialTranscript 
    : value;

  const effectiveIconColor = iconColor || colors.textTertiary;
  const effectiveActiveColor = activeColor || colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, ...shadows }, containerStyle]}>
      {leftIcon && (
        <Ionicons 
          name={leftIcon as any} 
          size={18} 
          color={leftIconColor || colors.textTertiary} 
          style={styles.leftIcon}
        />
      )}
      
      <TextInput
        {...textInputProps}
        style={[styles.input, { color: colors.textPrimary }, inputStyle]}
        placeholder={isListening ? 'Listening...' : placeholder}
        placeholderTextColor={isListening ? effectiveActiveColor : colors.textTertiary}
        value={displayValue}
        onChangeText={onChangeText}
      />

      {/* Clear button */}
      {showClearButton && value && String(value).length > 0 && !isListening && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      )}

      {/* Microphone button */}
      {isAvailable && (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            onPress={handleMicPress}
            style={[
              styles.micButton,
              isListening && { backgroundColor: effectiveActiveColor + '20' },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
            accessibilityLabel={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? (
              <Ionicons name="mic" size={20} color={effectiveActiveColor} />
            ) : (
              <Ionicons name="mic-outline" size={20} color={effectiveIconColor} />
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  leftIcon: {
    marginRight: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    margin: 0,
  },
  clearButton: {
    padding: 4,
  },
  micButton: {
    padding: 6,
    borderRadius: 20,
  },
});

export default SpeechInput;
