/**
 * Speech Recognition Service for DocScan Pro
 * Provides voice input capabilities with real-time transcription
 */
import { Platform, NativeEventEmitter, NativeModules } from 'react-native';

// Types
export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionError {
  code: string;
  message: string;
}

export type SpeechRecognitionCallback = (result: SpeechRecognitionResult) => void;
export type SpeechErrorCallback = (error: SpeechRecognitionError) => void;

// Supported locales for speech recognition
export const SPEECH_LOCALES = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'es-ES': 'Spanish (Spain)',
  'es-MX': 'Spanish (Mexico)',
  'fr-FR': 'French',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese (Brazil)',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'ar-SA': 'Arabic',
  'hi-IN': 'Hindi',
  'ta-IN': 'Tamil',
  'bn-IN': 'Bengali',
};

class SpeechRecognitionService {
  private isInitialized: boolean = false;
  private isListening: boolean = false;
  private currentLocale: string = 'en-US';
  private Voice: any = null;
  private eventEmitter: NativeEventEmitter | null = null;
  
  // Callbacks
  private onResultCallback: SpeechRecognitionCallback | null = null;
  private onErrorCallback: SpeechErrorCallback | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onPartialResultCallback: SpeechRecognitionCallback | null = null;
  
  // Event subscription cleanup
  private subscriptions: any[] = [];

  /**
   * Initialize the speech recognition service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    try {
      // Dynamic import to handle web platform gracefully
      const VoiceModule = require('@react-native-voice/voice').default;
      this.Voice = VoiceModule;
      
      if (!this.Voice) {
        console.log('Speech recognition not available on this platform');
        return false;
      }
      
      // Set up event listeners with proper cleanup tracking
      this.Voice.onSpeechStart = this.handleSpeechStart.bind(this);
      this.Voice.onSpeechEnd = this.handleSpeechEnd.bind(this);
      this.Voice.onSpeechResults = this.handleSpeechResults.bind(this);
      this.Voice.onSpeechPartialResults = this.handlePartialResults.bind(this);
      this.Voice.onSpeechError = this.handleSpeechError.bind(this);
      this.Voice.onSpeechRecognized = this.handleSpeechRecognized.bind(this);
      this.Voice.onSpeechVolumeChanged = this.handleVolumeChanged.bind(this);
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.log('Failed to initialize speech recognition:', error);
      return false;
    }
  }

  /**
   * Check if speech recognition is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.Voice) {
      await this.initialize();
    }
    
    try {
      if (this.Voice && this.Voice.isAvailable) {
        return await this.Voice.isAvailable();
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available locales for speech recognition
   */
  async getAvailableLocales(): Promise<string[]> {
    if (!this.Voice) {
      await this.initialize();
    }
    
    try {
      if (this.Voice && this.Voice.getSpeechRecognitionServices) {
        return await this.Voice.getSpeechRecognitionServices();
      }
      return Object.keys(SPEECH_LOCALES);
    } catch (error) {
      return Object.keys(SPEECH_LOCALES);
    }
  }

  /**
   * Set the recognition locale
   */
  setLocale(locale: string): void {
    if (SPEECH_LOCALES[locale as keyof typeof SPEECH_LOCALES]) {
      this.currentLocale = locale;
    }
  }

  /**
   * Start listening for speech input
   */
  async startListening(options?: {
    locale?: string;
    continuous?: boolean;
    interimResults?: boolean;
  }): Promise<boolean> {
    if (!await this.initialize()) {
      this.onErrorCallback?.({
        code: 'NOT_INITIALIZED',
        message: 'Speech recognition not available',
      });
      return false;
    }
    
    if (this.isListening) {
      await this.stopListening();
    }
    
    try {
      const locale = options?.locale || this.currentLocale;
      
      await this.Voice.start(locale);
      this.isListening = true;
      return true;
    } catch (error: any) {
      this.onErrorCallback?.({
        code: 'START_ERROR',
        message: error.message || 'Failed to start speech recognition',
      });
      return false;
    }
  }

  /**
   * Stop listening for speech input
   */
  async stopListening(): Promise<void> {
    if (!this.Voice || !this.isListening) return;
    
    try {
      await this.Voice.stop();
      this.isListening = false;
    } catch (error) {
      console.log('Error stopping speech recognition:', error);
    }
  }

  /**
   * Cancel speech recognition
   */
  async cancel(): Promise<void> {
    if (!this.Voice) return;
    
    try {
      await this.Voice.cancel();
      this.isListening = false;
    } catch (error) {
      console.log('Error canceling speech recognition:', error);
    }
  }

  /**
   * Destroy the service and clean up resources
   * IMPORTANT: Call this to prevent memory leaks
   */
  async destroy(): Promise<void> {
    try {
      if (this.isListening) {
        await this.cancel();
      }
      
      if (this.Voice) {
        await this.Voice.destroy();
        
        // Clear all callbacks
        this.Voice.onSpeechStart = null;
        this.Voice.onSpeechEnd = null;
        this.Voice.onSpeechResults = null;
        this.Voice.onSpeechPartialResults = null;
        this.Voice.onSpeechError = null;
        this.Voice.onSpeechRecognized = null;
        this.Voice.onSpeechVolumeChanged = null;
      }
      
      // Clear local callbacks
      this.onResultCallback = null;
      this.onErrorCallback = null;
      this.onStartCallback = null;
      this.onEndCallback = null;
      this.onPartialResultCallback = null;
      
      // Clear subscriptions
      this.subscriptions.forEach(sub => sub?.remove?.());
      this.subscriptions = [];
      
      this.isInitialized = false;
      this.isListening = false;
    } catch (error) {
      console.log('Error destroying speech recognition:', error);
    }
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  // Event handlers
  private handleSpeechStart(): void {
    this.isListening = true;
    this.onStartCallback?.();
  }

  private handleSpeechEnd(): void {
    this.isListening = false;
    this.onEndCallback?.();
  }

  private handleSpeechResults(event: any): void {
    if (event?.value && event.value.length > 0) {
      const result: SpeechRecognitionResult = {
        text: event.value[0],
        confidence: 1.0,
        isFinal: true,
      };
      this.onResultCallback?.(result);
    }
  }

  private handlePartialResults(event: any): void {
    if (event?.value && event.value.length > 0) {
      const result: SpeechRecognitionResult = {
        text: event.value[0],
        confidence: 0.5,
        isFinal: false,
      };
      this.onPartialResultCallback?.(result);
    }
  }

  private handleSpeechError(event: any): void {
    this.isListening = false;
    this.onErrorCallback?.({
      code: event?.error?.code || 'UNKNOWN',
      message: event?.error?.message || 'Speech recognition error',
    });
  }

  private handleSpeechRecognized(event: any): void {
    // Handle recognition event if needed
  }

  private handleVolumeChanged(event: any): void {
    // Handle volume changes for visual feedback if needed
  }

  // Callback setters
  onResult(callback: SpeechRecognitionCallback): void {
    this.onResultCallback = callback;
  }

  onError(callback: SpeechErrorCallback): void {
    this.onErrorCallback = callback;
  }

  onStart(callback: () => void): void {
    this.onStartCallback = callback;
  }

  onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  onPartialResult(callback: SpeechRecognitionCallback): void {
    this.onPartialResultCallback = callback;
  }

  /**
   * Remove all callbacks - use for cleanup
   */
  removeAllCallbacks(): void {
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onPartialResultCallback = null;
  }
}

// Export singleton instance
export const speechRecognition = new SpeechRecognitionService();
export default speechRecognition;
