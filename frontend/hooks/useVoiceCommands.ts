/**
 * useVoiceCommands Hook
 * Global voice command state & feedback throughout the app
 * Manages voice enabled/disabled state (persisted) and provides TTS feedback
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { voiceService, VOICE_COMMANDS, VoiceCommandResult } from '../services/VoiceCommandsService';
import haptics from '../utils/haptics';

const VOICE_ENABLED_KEY = '@DocScanPro:voiceEnabled';

interface UseVoiceCommandsOptions {
  onCommand?: (command: string, rawText: string) => void;
}

interface UseVoiceCommandsReturn {
  voiceEnabled: boolean;
  isSpeaking: boolean;
  toggleVoice: () => Promise<void>;
  setVoiceEnabled: (enabled: boolean) => Promise<void>;
  speak: (text: string, options?: { rate?: number }) => Promise<void>;
  stopSpeaking: () => void;
  announceAction: (action: string) => Promise<void>;
  announceError: (error: string) => Promise<void>;
  announceSuccess: (message: string) => Promise<void>;
  parseCommand: (text: string) => VoiceCommandResult;
}

export function useVoiceCommands(
  options: UseVoiceCommandsOptions = {}
): UseVoiceCommandsReturn {
  const [voiceEnabled, setVoiceEnabledState] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isMountedRef = useRef(true);

  // Load persisted voice state
  useEffect(() => {
    isMountedRef.current = true;
    const loadState = async () => {
      try {
        const stored = await AsyncStorage.getItem(VOICE_ENABLED_KEY);
        if (stored !== null && isMountedRef.current) {
          setVoiceEnabledState(stored === 'true');
        }
      } catch (e) {
        // Default to false
      }
    };
    loadState();
    return () => {
      isMountedRef.current = false;
      voiceService.stopAll();
    };
  }, []);

  const setVoiceEnabled = useCallback(async (enabled: boolean) => {
    setVoiceEnabledState(enabled);
    try {
      await AsyncStorage.setItem(VOICE_ENABLED_KEY, String(enabled));
    } catch (e) {
      // Silently fail
    }
    if (enabled) {
      haptics.success();
      await voiceService.speak('Voice feedback enabled');
    } else {
      haptics.medium();
      voiceService.stopAll();
    }
  }, []);

  const toggleVoice = useCallback(async () => {
    await setVoiceEnabled(!voiceEnabled);
  }, [voiceEnabled, setVoiceEnabled]);

  const speak = useCallback(async (text: string, opts?: { rate?: number }) => {
    if (!voiceEnabled) return;
    setIsSpeaking(true);
    try {
      await voiceService.speak(text, { rate: opts?.rate });
    } catch (e) {
      // Ignore
    } finally {
      if (isMountedRef.current) setIsSpeaking(false);
    }
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    voiceService.stopAll();
    if (isMountedRef.current) setIsSpeaking(false);
  }, []);

  const announceAction = useCallback(async (action: string) => {
    if (!voiceEnabled) return;
    await voiceService.speak(action, { rate: 1.1 });
  }, [voiceEnabled]);

  const announceError = useCallback(async (error: string) => {
    if (!voiceEnabled) return;
    haptics.error();
    await voiceService.announceError(error);
  }, [voiceEnabled]);

  const announceSuccess = useCallback(async (message: string) => {
    if (!voiceEnabled) return;
    haptics.success();
    await voiceService.announceSuccess(message);
  }, [voiceEnabled]);

  const parseCommand = useCallback((text: string) => {
    return voiceService.parseCommand(text);
  }, []);

  return {
    voiceEnabled,
    isSpeaking,
    toggleVoice,
    setVoiceEnabled,
    speak,
    stopSpeaking,
    announceAction,
    announceError,
    announceSuccess,
    parseCommand,
  };
}

export default useVoiceCommands;
