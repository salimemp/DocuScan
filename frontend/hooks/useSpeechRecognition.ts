/**
 * useSpeechRecognition Hook
 * Provides easy integration of speech recognition in React components
 * Handles cleanup automatically to prevent memory leaks
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { speechRecognition, SpeechRecognitionResult, SpeechRecognitionError } from '../services/SpeechRecognitionService';
import { voiceService, VOICE_COMMANDS } from '../services/VoiceCommandsService';
import haptics from '../utils/haptics';

interface UseSpeechRecognitionOptions {
  locale?: string;
  continuous?: boolean;
  onCommand?: (command: string, rawText: string) => void;
  autoParseCommands?: boolean;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isAvailable: boolean;
  transcript: string;
  partialTranscript: string;
  error: SpeechRecognitionError | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  resetTranscript: () => void;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    locale = 'en-US',
    continuous = false,
    onCommand,
    autoParseCommands = true,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const onCommandRef = useRef(onCommand);
  
  // Keep onCommand ref up to date
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  // Initialize and check availability
  useEffect(() => {
    isMountedRef.current = true;
    
    const init = async () => {
      const available = await speechRecognition.isAvailable();
      if (isMountedRef.current) {
        setIsAvailable(available);
      }
    };
    
    init();
    
    // Cleanup on unmount - CRITICAL for preventing memory leaks
    return () => {
      isMountedRef.current = false;
      speechRecognition.removeAllCallbacks();
      speechRecognition.cancel();
    };
  }, []);

  // Set up callbacks
  useEffect(() => {
    speechRecognition.onResult((result: SpeechRecognitionResult) => {
      if (!isMountedRef.current) return;
      
      setTranscript(result.text);
      setPartialTranscript('');
      haptics.success();
      
      // Parse commands if enabled
      if (autoParseCommands && result.isFinal) {
        const parsed = voiceService.parseCommand(result.text);
        if (parsed.command && onCommandRef.current) {
          onCommandRef.current(parsed.command, result.text);
        }
      }
    });

    speechRecognition.onPartialResult((result: SpeechRecognitionResult) => {
      if (!isMountedRef.current) return;
      setPartialTranscript(result.text);
    });

    speechRecognition.onError((err: SpeechRecognitionError) => {
      if (!isMountedRef.current) return;
      setError(err);
      setIsListening(false);
      haptics.error();
    });

    speechRecognition.onStart(() => {
      if (!isMountedRef.current) return;
      setIsListening(true);
      setError(null);
      haptics.medium();
    });

    speechRecognition.onEnd(() => {
      if (!isMountedRef.current) return;
      setIsListening(false);
    });

    // Cleanup callbacks on unmount
    return () => {
      speechRecognition.removeAllCallbacks();
    };
  }, [autoParseCommands]);

  const startListening = useCallback(async () => {
    setError(null);
    setPartialTranscript('');
    
    const success = await speechRecognition.startListening({
      locale,
      continuous,
      interimResults: true,
    });
    
    if (!success && isMountedRef.current) {
      setError({
        code: 'START_FAILED',
        message: 'Failed to start speech recognition',
      });
    }
  }, [locale, continuous]);

  const stopListening = useCallback(async () => {
    await speechRecognition.stopListening();
    if (isMountedRef.current) {
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setPartialTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    isAvailable,
    transcript,
    partialTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

export default useSpeechRecognition;
