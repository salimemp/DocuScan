/**
 * Speech Recognition Service for DocScan Pro
 * Provides voice input capabilities with real-time transcription.
 *
 * Platform dispatch (2026-06-28 — see FOLLOW_UPS.md #5):
 *   • Web    → browser SpeechRecognition API (Chrome/Edge/Safari Tech-Preview)
 *   • Native → @react-native-voice/voice (iOS + Android, requires the
 *               NSMicrophone + NSSpeechRecognition / RECORD_AUDIO permissions
 *               declared in app.json — already present.)
 *
 * Both paths normalize to the same callback surface (onStart / onEnd /
 * onResult / onPartialResult / onError) so consumers don't need to branch
 * on Platform.OS.
 */
import { Platform } from 'react-native';
import { getErrorMessage } from '../utils/errorHelpers';

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

// ── Web Speech API type shims (not in standard lib.dom.d.ts) ────────────────
// The Web Speech API is the W3C draft and is prefixed in Chrome. We only
// declare the parts we use; everything else is left as `any`.

interface WebSpeechRecognitionResult {
  readonly transcript: string;
  readonly confidence: number;
}

interface WebSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<{
    readonly isFinal: boolean;
    readonly length: number;
    [index: number]: WebSpeechRecognitionResult;
  }>;
}

interface WebSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

interface WebSpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: WebSpeechRecognitionInstance, ev: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((this: WebSpeechRecognitionInstance, ev: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: WebSpeechRecognitionInstance, ev: Event) => void) | null;
  onstart: ((this: WebSpeechRecognitionInstance, ev: Event) => void) | null;
}

type WebSpeechRecognitionCtor = new () => WebSpeechRecognitionInstance;

function getWebSpeechRecognition(): WebSpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: WebSpeechRecognitionCtor;
    webkitSpeechRecognition?: WebSpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

class SpeechRecognitionService {
  private isInitialized: boolean = false;
  private isListening: boolean = false;
  private currentLocale: string = 'en-US';
  private Voice: any = null;

  // Web-specific
  private webRecognition: WebSpeechRecognitionInstance | null = null;

  // Callbacks
  private onResultCallback: SpeechRecognitionCallback | null = null;
  private onErrorCallback: SpeechErrorCallback | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onPartialResultCallback: SpeechRecognitionCallback | null = null;

  // Event subscription cleanup
  private subscriptions: any[] = [];

  /**
   * Initialize the speech recognition service for the current platform.
   * Returns true if the platform's recognition backend is available
   * (native module on iOS/Android; Web Speech API in browser).
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    if (Platform.OS === 'web') {
      const Ctor = getWebSpeechRecognition();
      if (!Ctor) {
        console.log('[Speech] Web SpeechRecognition API not available in this browser');
        return false;
      }
      this.webRecognition = new Ctor();
      this.webRecognition.continuous = false;
      this.webRecognition.interimResults = true;
      this.webRecognition.maxAlternatives = 1;

      this.webRecognition.onstart = () => this.handleSpeechStart();
      this.webRecognition.onend = () => this.handleSpeechEnd();
      this.webRecognition.onerror = (ev) => this.handleWebError(ev);
      this.webRecognition.onresult = (ev) => this.handleWebResult(ev);

      this.isInitialized = true;
      return true;
    }

    try {
      // Dynamic import so the native module is only loaded on iOS/Android.
      // On web this require() resolves to a no-op stub (web bundles
      // shouldn't try to load the native module).
      const VoiceModule = require('@react-native-voice/voice').default;
      this.Voice = VoiceModule;

      if (!this.Voice) {
        console.log('[Speech] Native voice module not available');
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
      console.log('[Speech] Failed to initialize native speech recognition:', error);
      return false;
    }
  }

  /**
   * Check if speech recognition is available on this platform.
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized) {
      const ok = await this.initialize();
      if (!ok) return false;
    }

    if (Platform.OS === 'web') {
      return this.webRecognition !== null;
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
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = getWebSpeechRecognition();
      if (!SpeechRecognition) return Object.keys(SPEECH_LOCALES);
      // The Web Speech API doesn't expose a list of supported languages,
      // so we return our curated set and let the browser silently reject
      // any locale it doesn't support.
      return Object.keys(SPEECH_LOCALES);
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

    const locale = options?.locale || this.currentLocale;

    if (Platform.OS === 'web') {
      if (!this.webRecognition) {
        this.onErrorCallback?.({
          code: 'NOT_INITIALIZED',
          message: 'Web SpeechRecognition not initialized',
        });
        return false;
      }
      try {
        this.webRecognition.lang = locale;
        this.webRecognition.continuous = options?.continuous ?? false;
        this.webRecognition.interimResults = options?.interimResults ?? true;
        this.webRecognition.start();
        this.isListening = true;
        return true;
      } catch (error: unknown) {
        // Browsers throw InvalidStateError if start() is called twice
        // without an intermediate stop(). Treat as recoverable.
        this.onErrorCallback?.({
          code: 'START_ERROR',
          message: getErrorMessage(error) || 'Failed to start speech recognition',
        });
        return false;
      }
    }

    try {
      await this.Voice.start(locale);
      this.isListening = true;
      return true;
    } catch (error: unknown) {
      this.onErrorCallback?.({
        code: 'START_ERROR',
        message: getErrorMessage(error) || 'Failed to start speech recognition',
      });
      return false;
    }
  }

  /**
   * Stop listening for speech input
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    if (Platform.OS === 'web') {
      if (!this.webRecognition) return;
      try {
        this.webRecognition.stop();
      } catch (error) {
        console.log('[Speech] Error stopping web recognition:', error);
      }
      return;
    }

    if (!this.Voice) return;
    try {
      await this.Voice.stop();
    } catch (error) {
      console.log('[Speech] Error stopping speech recognition:', error);
    }
  }

  /**
   * Cancel speech recognition
   */
  async cancel(): Promise<void> {
    if (Platform.OS === 'web') {
      if (!this.webRecognition) return;
      try {
        this.webRecognition.abort();
      } catch (error) {
        console.log('[Speech] Error canceling web recognition:', error);
      }
      this.isListening = false;
      return;
    }
    if (!this.Voice) return;
    try {
      await this.Voice.cancel();
    } catch (error) {
      console.log('[Speech] Error canceling speech recognition:', error);
    }
    this.isListening = false;
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

      if (Platform.OS === 'web') {
        if (this.webRecognition) {
          // Detach handlers to avoid leaks when the Web SpeechRecognition
          // object is GC'd. Browsers will fire onend on their own.
          this.webRecognition.onresult = null;
          this.webRecognition.onerror = null;
          this.webRecognition.onend = null;
          this.webRecognition.onstart = null;
          this.webRecognition = null;
        }
      } else if (this.Voice) {
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
      console.log('[Speech] Error destroying speech recognition:', error);
    }
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  // ── Event handlers ──────────────────────────────────────────────────────

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

  private handleSpeechRecognized(_event: any): void {
    // Handle recognition event if needed
  }

  private handleVolumeChanged(_event: any): void {
    // Handle volume changes for visual feedback if needed
  }

  // Web event handlers — the W3C SpeechRecognitionEvent shape is different
  // from @react-native-voice's, so we normalize here.

  private handleWebResult(ev: WebSpeechRecognitionEvent): void {
    // The Web Speech API may emit multiple results per event (one per
    // finalized phrase + interim phrases). We forward each as its own
    // result/partialResult depending on `isFinal`.
    const results = Array.from(ev.results ?? []);
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const alt = r[0];
      if (!alt) continue;
      const payload: SpeechRecognitionResult = {
        text: alt.transcript ?? '',
        confidence: alt.confidence ?? 0,
        isFinal: !!r.isFinal,
      };
      if (payload.isFinal) {
        this.onResultCallback?.(payload);
      } else {
        this.onPartialResultCallback?.(payload);
      }
    }
  }

  private handleWebError(ev: WebSpeechRecognitionErrorEvent): void {
    this.isListening = false;
    this.onErrorCallback?.({
      code: ev.error || 'UNKNOWN',
      message: ev.message || `Speech recognition error: ${ev.error}`,
    });
  }

  // ── Callback setters ────────────────────────────────────────────────────

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
