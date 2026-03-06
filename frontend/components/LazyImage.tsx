import React, { useState, useCallback, memo } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface LazyImageProps {
  source: { uri: string } | number;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholder?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

export const LazyImage = memo(function LazyImage({
  source,
  style,
  containerStyle,
  placeholder,
  resizeMode = 'cover',
}: LazyImageProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  return (
    <View style={[styles.container, containerStyle]}>
      {loading && (
        <View style={[styles.placeholder, { backgroundColor: colors.surfaceHighlight }]}>
          {placeholder || <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      )}
      {!error && (
        <Image
          source={source}
          style={[styles.image, style, loading && styles.hidden]}
          resizeMode={resizeMode}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
        />
      )}
      {error && (
        <View style={[styles.placeholder, { backgroundColor: colors.surfaceHighlight }]}>
          <View style={[styles.errorIcon, { backgroundColor: colors.error + '20' }]} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hidden: {
    opacity: 0,
    position: 'absolute',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});

export default LazyImage;
