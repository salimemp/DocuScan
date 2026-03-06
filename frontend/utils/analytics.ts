// Analytics service for tracking user preferences and actions
import AsyncStorage from '@react-native-async-storage/async-storage';

const ANALYTICS_KEY = '@DocScanPro:analytics';

export interface AnalyticsEvent {
  type: string;
  data?: Record<string, any>;
  timestamp: string;
}

interface AnalyticsStore {
  events: AnalyticsEvent[];
  consent: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    acceptedAt?: string;
  } | null;
}

class Analytics {
  private store: AnalyticsStore = { events: [], consent: null };
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const stored = await AsyncStorage.getItem(ANALYTICS_KEY);
      if (stored) {
        this.store = JSON.parse(stored);
      }
      this.initialized = true;
    } catch (e) {
      console.log('Analytics init error:', e);
    }
  }

  private async save(): Promise<void> {
    try {
      // Keep only last 100 events to prevent storage bloat
      if (this.store.events.length > 100) {
        this.store.events = this.store.events.slice(-100);
      }
      await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(this.store));
    } catch (e) {
      console.log('Analytics save error:', e);
    }
  }

  // Track cookie consent preferences
  async trackConsent(consent: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
  }): Promise<void> {
    await this.init();
    this.store.consent = {
      ...consent,
      acceptedAt: new Date().toISOString(),
    };
    await this.trackEvent('consent_updated', consent);
    await this.save();
  }

  // Get current consent status
  async getConsent(): Promise<AnalyticsStore['consent']> {
    await this.init();
    return this.store.consent;
  }

  // Track general events (only if analytics consent is given)
  async trackEvent(type: string, data?: Record<string, any>): Promise<void> {
    await this.init();
    
    // Always track consent events, other events only with consent
    if (type !== 'consent_updated' && !this.store.consent?.analytics) {
      return;
    }

    const event: AnalyticsEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    this.store.events.push(event);
    await this.save();
  }

  // Track onboarding completion
  async trackOnboardingComplete(): Promise<void> {
    await this.trackEvent('onboarding_complete');
  }

  // Track language change
  async trackLanguageChange(from: string, to: string): Promise<void> {
    await this.trackEvent('language_changed', { from, to });
  }

  // Track document actions
  async trackDocumentAction(action: string, docType?: string): Promise<void> {
    await this.trackEvent('document_action', { action, docType });
  }

  // Track export
  async trackExport(format: string): Promise<void> {
    await this.trackEvent('export', { format });
  }

  // Track feature usage
  async trackFeatureUsage(feature: string): Promise<void> {
    await this.trackEvent('feature_used', { feature });
  }

  // Get analytics summary (for debugging/admin)
  async getSummary(): Promise<{
    totalEvents: number;
    consent: AnalyticsStore['consent'];
    recentEvents: AnalyticsEvent[];
  }> {
    await this.init();
    return {
      totalEvents: this.store.events.length,
      consent: this.store.consent,
      recentEvents: this.store.events.slice(-10),
    };
  }

  // Clear all analytics data
  async clear(): Promise<void> {
    this.store = { events: [], consent: null };
    await AsyncStorage.removeItem(ANALYTICS_KEY);
  }
}

export const analytics = new Analytics();
export default analytics;
