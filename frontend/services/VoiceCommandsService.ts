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

// Voice command patterns - Extended with more commands
export const VOICE_COMMANDS = {
  // Scanning commands
  SCAN: ['scan', 'capture', 'take photo', 'photograph', 'shoot', 'snap', 'take picture', 'click', 'camera'],
  FLASH: ['flash', 'light', 'torch', 'flashlight', 'flash on', 'flash off', 'toggle flash'],
  FLIP: ['flip', 'switch', 'front', 'back', 'selfie', 'rear camera', 'front camera', 'switch camera', 'rotate camera'],
  
  // Navigation commands
  CONTINUE: ['continue', 'done', 'finish', 'next', 'proceed', 'save', 'confirm', 'submit', 'complete'],
  CANCEL: ['cancel', 'stop', 'exit', 'close', 'back', 'go back', 'return', 'dismiss', 'abort'],
  GALLERY: ['gallery', 'import', 'photos', 'library', 'album', 'photo library', 'camera roll', 'pick photo', 'select image'],
  
  // Batch scanning commands
  BATCH_START: ['batch', 'batch mode', 'start batch', 'auto scan', 'continuous', 'multi scan', 'multiple pages'],
  BATCH_STOP: ['stop batch', 'end batch', 'stop scanning', 'pause', 'halt'],
  
  // Document management commands
  DELETE: ['delete', 'remove', 'trash', 'discard', 'erase', 'clear'],
  UNDO: ['undo', 'reverse', 'go back', 'revert'],
  REDO: ['redo', 'repeat', 'do again'],
  SELECT_ALL: ['select all', 'choose all', 'pick all'],
  DESELECT: ['deselect', 'unselect', 'clear selection'],
  
  // View commands
  ZOOM_IN: ['zoom in', 'enlarge', 'bigger', 'magnify', 'make bigger'],
  ZOOM_OUT: ['zoom out', 'smaller', 'shrink', 'make smaller', 'reduce'],
  ROTATE: ['rotate', 'turn', 'spin', 'rotate left', 'rotate right'],
  
  // Read aloud commands
  READ: ['read', 'read aloud', 'speak', 'read text', 'text to speech', 'narrate', 'read document'],
  STOP_READING: ['stop reading', 'stop speaking', 'silence', 'quiet', 'mute', 'hush'],
  SLOWER: ['slower', 'slow down', 'decrease speed', 'speak slower'],
  FASTER: ['faster', 'speed up', 'increase speed', 'speak faster'],
  
  // Export commands
  EXPORT: ['export', 'download', 'save as', 'convert'],
  EXPORT_PDF: ['export pdf', 'save as pdf', 'create pdf', 'make pdf'],
  EXPORT_DOCX: ['export word', 'save as word', 'export docx', 'create document'],
  SHARE: ['share', 'send', 'share document', 'send to'],
  
  // Security commands
  ENCRYPT: ['encrypt', 'lock', 'secure', 'password protect', 'add password'],
  DECRYPT: ['decrypt', 'unlock', 'open', 'remove password'],
  
  // Math solver commands
  SOLVE: ['solve', 'calculate', 'math', 'solve math', 'equation', 'compute'],
  
  // Settings commands
  SETTINGS: ['settings', 'preferences', 'options', 'configure'],
  LANGUAGE: ['language', 'change language', 'switch language'],
  THEME: ['theme', 'dark mode', 'light mode', 'appearance'],
  
  // Help commands
  HELP: ['help', 'commands', 'what can you do', 'assistance', 'guide', 'instructions', 'how to'],
  
  // Confirmation commands
  YES: ['yes', 'yeah', 'yep', 'correct', 'affirmative', 'okay', 'ok', 'sure', 'confirm'],
  NO: ['no', 'nope', 'negative', 'cancel', 'deny', 'reject'],
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
   * Announce command help - Extended version
   */
  async announceHelp() {
    const helpText = `
      Available voice commands:
      
      Scanning: Say "scan", "capture", or "snap" to take a photo.
      Say "batch" to start continuous scanning.
      Say "flash" to toggle the flashlight.
      Say "flip" to switch between front and rear camera.
      Say "gallery" to import photos from your library.
      
      Navigation: Say "continue" or "done" when finished.
      Say "cancel" or "back" to go back.
      
      Reading: Say "read" to have the document read aloud.
      Say "faster" or "slower" to adjust reading speed.
      Say "stop reading" to stop.
      
      Export: Say "export PDF" or "share" to export your document.
      
      Security: Say "encrypt" to password-protect your document.
      
      Say "help" anytime to hear these commands again.
    `;
    await this.speak(helpText);
  }

  /**
   * Announce quick help (shorter version)
   */
  async announceQuickHelp() {
    await this.speak('Say "scan" to capture, "batch" for continuous mode, "read" to read aloud, or "help" for all commands.');
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
   * Announce document exported
   */
  async announceExportComplete(format: string) {
    await this.speak(`Document exported as ${format} successfully.`);
  }

  /**
   * Announce encryption status
   */
  async announceEncryption(encrypted: boolean) {
    if (encrypted) {
      await this.speak('Document has been encrypted and secured.');
    } else {
      await this.speak('Document has been decrypted.');
    }
  }

  /**
   * Announce page navigation
   */
  async announcePageChange(currentPage: number, totalPages: number) {
    await this.speak(`Page ${currentPage} of ${totalPages}.`, { rate: 1.1 });
  }

  /**
   * Announce zoom level
   */
  async announceZoom(level: number) {
    const percentage = Math.round(level * 100);
    await this.speak(`Zoom ${percentage} percent.`, { rate: 1.1 });
  }

  /**
   * Announce rotation
   */
  async announceRotation(degrees: number) {
    await this.speak(`Rotated ${degrees} degrees.`, { rate: 1.1 });
  }

  /**
   * Announce reading speed change
   */
  async announceSpeedChange(speed: number) {
    const speedLabel = speed < 0.8 ? 'slow' : speed > 1.2 ? 'fast' : 'normal';
    await this.speak(`Reading speed set to ${speedLabel}.`, { rate: 1.0 });
  }

  /**
   * Announce math solution
   */
  async announceMathSolution(solution: string) {
    await this.speak(`The solution is: ${solution}`);
  }

  /**
   * Announce confirmation prompt
   */
  async askConfirmation(action: string): Promise<void> {
    await this.speak(`Are you sure you want to ${action}? Say yes to confirm or no to cancel.`);
  }

  /**
   * Announce document saved
   */
  async announceDocumentSaved(title: string) {
    await this.speak(`Document "${title}" has been saved.`);
  }

  /**
   * Announce welcome message
   */
  async announceWelcome() {
    await this.speak('Welcome to DocScan Pro. Say "scan" to start scanning, or "help" for available commands.');
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
