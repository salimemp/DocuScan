import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Platform, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'invisible';
}

/**
 * Cloudflare Turnstile widget for bot protection.
 * - On web: Dynamically loads the Turnstile script into the DOM
 * - On native (iOS/Android): Uses WebView with inline HTML
 */
export default function TurnstileWidget({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  size = 'normal',
}: TurnstileWidgetProps) {
  const [loading, setLoading] = useState(true);

  // For web platform
  if (Platform.OS === 'web') {
    return (
      <TurnstileWeb
        siteKey={siteKey}
        onVerify={onVerify}
        onError={onError}
        onExpire={onExpire}
        theme={theme}
        size={size}
      />
    );
  }

  // For native platforms (iOS/Android) - use WebView
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=_turnstileCb" async defer></script>
        <style>
          body {
            margin: 0;
            padding: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: transparent;
            min-height: 80px;
          }
          .loading {
            font-family: system-ui, -apple-system, sans-serif;
            color: #888;
            font-size: 13px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div id="turnstile-container"><p class="loading">Loading verification...</p></div>
        <script>
          function _turnstileCb() {
            turnstile.render('#turnstile-container', {
              sitekey: '${siteKey}',
              theme: '${theme}',
              size: '${size}',
              callback: function(token) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'verify', token: token }));
              },
              'error-callback': function(error) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: error || 'Verification failed' }));
              },
              'expired-callback': function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expire' }));
              }
            });
          }
        </script>
      </body>
    </html>
  `;

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'verify') {
        setLoading(false);
        onVerify(data.token);
      } else if (data.type === 'error') {
        setLoading(false);
        onError?.(data.error);
      } else if (data.type === 'expire') {
        onExpire?.();
      }
    } catch {
      // Ignore parse errors
    }
  }, [onVerify, onError, onExpire]);

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.loadingText}>Loading verification...</Text>
        </View>
      )}
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={[styles.webview, loading && styles.hidden]}
        onMessage={handleMessage}
        onLoad={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
}

/**
 * Web-specific Turnstile implementation using DOM injection
 */
function TurnstileWeb({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme,
  size,
}: TurnstileWidgetProps) {
  const containerRef = useRef<View>(null);
  const [loading, setLoading] = useState(true);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Create a unique container ID
    const containerId = `turnstile-${Date.now()}`;

    // Access the DOM element through the ref
    const setupTurnstile = () => {
      const container = document.getElementById(containerId);
      if (!container) return;

      // Check if Turnstile script is already loaded
      const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
      
      const renderWidget = () => {
        if ((window as any).turnstile && container) {
          widgetIdRef.current = (window as any).turnstile.render(container, {
            sitekey: siteKey,
            theme,
            size,
            callback: (token: string) => {
              setLoading(false);
              onVerify(token);
            },
            'error-callback': (error: string) => {
              setLoading(false);
              onError?.(error || 'Verification failed');
            },
            'expired-callback': () => {
              onExpire?.();
            },
          });
          setLoading(false);
        }
      };

      if (existingScript && (window as any).turnstile) {
        renderWidget();
      } else if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          // Small delay to ensure turnstile is ready
          setTimeout(renderWidget, 100);
        };
        document.head.appendChild(script);
      } else {
        // Script exists but not loaded yet
        const checkInterval = setInterval(() => {
          if ((window as any).turnstile) {
            clearInterval(checkInterval);
            renderWidget();
          }
        }, 100);

        // Cleanup interval after 10s
        setTimeout(() => clearInterval(checkInterval), 10000);
      }
    };

    // Create a DOM div for Turnstile to render into
    requestAnimationFrame(() => {
      const nativeElement = document.getElementById(containerId);
      if (nativeElement) {
        setupTurnstile();
      }
    });

    return () => {
      // Cleanup widget
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [siteKey, theme, size, onVerify, onError, onExpire]);

  // On web, render a div that Turnstile can attach to
  return (
    <View style={styles.webContainer}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.loadingText}>Loading verification...</Text>
        </View>
      )}
      <View
        ref={containerRef}
        style={styles.turnstileDiv}
        // @ts-ignore - nativeID creates id attribute on web
        nativeID={`turnstile-${Date.now()}`}
        id={`turnstile-web`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 80,
    width: '100%',
    alignItems: 'center',
    marginVertical: 8,
  },
  webview: {
    width: 310,
    height: 80,
    backgroundColor: 'transparent',
  },
  hidden: {
    opacity: 0,
    height: 0,
  },
  loadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#888',
  },
  webContainer: {
    alignItems: 'center',
    marginVertical: 8,
    minHeight: 70,
  },
  turnstileDiv: {
    minWidth: 300,
    minHeight: 65,
  },
});
