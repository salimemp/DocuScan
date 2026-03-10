/**
 * Voice Commands Service for DocScan Pro
 * Provides voice control and real-time speech translation
 */
import * as Speech from 'expo-speech';
import { Platform, Alert } from 'react-native';

// Supported languages for translation
export const SUPPORTED_LANGUAGES = {
  'en': { name: 'English', code: 'en-US' },
  'es': { name: 'Spanish', code: 'es-ES' },
  'fr': { name: 'French', code: 'fr-FR' },
  'de': { name: 'German', code: 'de-DE' },
  'it': { name: 'Italian', code: 'it-IT' },
  'pt': { name: 'Portuguese', code: 'pt-BR' },
  'zh': { name: 'Chinese', code: 'zh-CN' },
  'ja': { name: 'Japanese', code: 'ja-JP' },
  'ko': { name: 'Korean', code: 'ko-KR' },
  'ar': { name: 'Arabic', code: 'ar-SA' },
  'hi': { name: 'Hindi', code: 'hi-IN' },
  'ta': { name: 'Tamil', code: 'ta-IN' },
  'bn': { name: 'Bengali', code: 'bn-IN' },
};

// Voice command patterns
export const VOICE_COMMANDS = {
  SCAN: ['scan', 'capture', 'take photo', 'photograph', 'shoot'],
  FLASH: ['flash', 'light', 'torch', 'flashlight'],
  FLIP: ['flip', 'switch', 'front', 'back', 'selfie'],
  CONTINUE: ['continue', 'done', 'finish', 'next', 'proceed'],
  CANCEL: ['cancel', 'stop', 'exit', 'close', 'back'],
  GALLERY: ['gallery', 'import', 'photos', 'library', 'album'],
  HELP: ['help', 'commands', 'what can you do'],
};

export interface VoiceCommandResult {
  command: string | null;
  confidence: number;
  rawText: string;
}

export interface SpeechOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
}

class VoiceCommandsService {
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private currentLanguage: string = 'en-US';
  private onCommandCallback: ((result: VoiceCommandResult) => void) | null = null;

  /**
   * Set the current language for speech
   */
  setLanguage(langCode: string) {
    const lang = SUPPORTED_LANGUAGES[langCode as keyof typeof SUPPORTED_LANGUAGES];
    if (lang) {
      this.currentLanguage = lang.code;
    }
  }

  /**
   * Get available voices for the current platform
   */
  async getAvailableVoices() {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices;
    } catch (e) {
      console.log('Error getting voices:', e);
      return [];
    }
  }

  /**
   * Speak text using text-to-speech
   */
  async speak(text: string, options: SpeechOptions = {}) {
    if (this.isSpeaking) {
      await this.stopSpeaking();
    }

    this.isSpeaking = true;

    return new Promise<void>((resolve, reject) => {
      Speech.speak(text, {
        language: options.language || this.currentLanguage,
        pitch: options.pitch || 1.0,
        rate: options.rate || 0.9,
        volume: options.volume || 1.0,
        onDone: () => {
          this.isSpeaking = false;
          resolve();
        },
        onError: (error) => {
          this.isSpeaking = false;
          reject(error);
        },
        onStopped: () => {
          this.isSpeaking = false;
          resolve();
        },
      });
    });
  }

  /**
   * Stop speaking
   */
  async stopSpeaking() {
    if (this.isSpeaking) {
      Speech.stop();
      this.isSpeaking = false;
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }

  /**
   * Parse voice command from text
   */
  parseCommand(text: string): VoiceCommandResult {
    const normalizedText = text.toLowerCase().trim();
    
    for (const [command, patterns] of Object.entries(VOICE_COMMANDS)) {
      for (const pattern of patterns) {
        if (normalizedText.includes(pattern)) {
          // Calculate confidence based on exact match or partial match
          const confidence = normalizedText === pattern ? 1.0 : 0.8;
          return {
            command,
            confidence,
            rawText: text,
          };
        }
      }
    }

    return {
      command: null,
      confidence: 0,
      rawText: text,
    };
  }

  /**
   * Announce scan mode
   */
  async announceScanMode(pageCount: number) {
    const messages: Record<string, string> = {
      0: 'Scanner ready. Say "scan" to capture, or "gallery" to import photos.',
      1: 'Page captured. Say "scan" for more pages, or "continue" when done.',
    };
    
    const message = pageCount === 0 ? messages[0] : 
      `${pageCount} page${pageCount > 1 ? 's' : ''} captured. ${messages[1]}`;
    
    await this.speak(message);
  }

  /**
   * Announce batch mode start
   */
  async announceBatchMode(interval: number) {
    await this.speak(`Batch scanning mode. Auto-capturing every ${interval} seconds. Say "stop" to end.`);
  }

  /**
   * Announce capture
   */
  async announceCapture(pageNumber: number) {
    await this.speak(`Page ${pageNumber} captured.`, { rate: 1.2 });
  }

  /**
   * Announce command help
   */
  async announceHelp() {
    const helpText = `
      Available commands:
      Say "scan" or "capture" to take a photo.
      Say "flash" to toggle the flash.
      Say "flip" to switch cameras.
      Say "gallery" to import from photos.
      Say "continue" when finished scanning.
      Say "cancel" to exit.
    `;
    await this.speak(helpText);
  }

  /**
   * Announce error
   */
  async announceError(error: string) {
    await this.speak(`Error: ${error}`, { rate: 0.9 });
  }

  /**
   * Announce success
   */
  async announceSuccess(message: string) {
    await this.speak(message);
  }

  /**
   * Translate text using backend API
   */
  async translateText(
    text: string, 
    fromLang: string, 
    toLang: string,
    backendUrl: string
  ): Promise<string> {
    try {
      const response = await fetch(`${backendUrl}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          from_language: fromLang,
          to_language: toLang,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.translated_text || text;
      }
      return text;
    } catch (e) {
      console.log('Translation error:', e);
      return text;
    }
  }

  /**
   * Read document text aloud with optional translation
   */
  async readDocument(
    text: string,
    options: {
      translateTo?: string;
      backendUrl?: string;
      rate?: number;
      onProgress?: (progress: number) => void;
    } = {}
  ) {
    let textToRead = text;

    // Translate if requested
    if (options.translateTo && options.backendUrl) {
      textToRead = await this.translateText(
        text,
        'en', // Auto-detect in future
        options.translateTo,
        options.backendUrl
      );
    }

    // Split into sentences for progress tracking
    const sentences = textToRead.match(/[^.!?]+[.!?]+/g) || [textToRead];
    
    for (let i = 0; i < sentences.length; i++) {
      await this.speak(sentences[i].trim(), {
        rate: options.rate || 0.9,
        language: options.translateTo ? 
          SUPPORTED_LANGUAGES[options.translateTo as keyof typeof SUPPORTED_LANGUAGES]?.code : 
          this.currentLanguage,
      });
      
      if (options.onProgress) {
        options.onProgress((i + 1) / sentences.length);
      }
    }
  }

  /**
   * Stop all voice operations
   */
  stopAll() {
    this.stopSpeaking();
    this.isListening = false;
  }
}

export const voiceService = new VoiceCommandsService();
export default voiceService;
