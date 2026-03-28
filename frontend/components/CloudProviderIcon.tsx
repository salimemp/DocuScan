import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G, Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';

interface CloudProviderIconProps {
  provider: 'icloud' | 'gdrive' | 'dropbox' | 'onedrive' | 'box';
  size?: number;
}

export const CloudProviderIcon: React.FC<CloudProviderIconProps> = ({ provider, size = 32 }) => {
  const scale = size / 32;
  
  switch (provider) {
    case 'icloud':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Defs>
            <LinearGradient id="icloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#5AC8FA" />
              <Stop offset="100%" stopColor="#007AFF" />
            </LinearGradient>
          </Defs>
          <Path
            d="M26.5 14.5c0-.3 0-.5-.1-.8C26.1 9.6 22.5 6 18 6c-3.4 0-6.3 2-7.6 4.9-.5-.2-1-.3-1.5-.3-2.2 0-4 1.8-4 4 0 .4.1.8.2 1.2C3.3 16.5 2 18.4 2 20.5 2 23.5 4.5 26 7.5 26h17c2.8 0 5-2.2 5-5 0-2.6-2-4.8-4.5-5-.5-1-1.3-1.5-1.5-1.5z"
            fill="url(#icloudGrad)"
          />
        </Svg>
      );
      
    case 'gdrive':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Path d="M11.5 4L2 21l4.5 7h9L6 11.5z" fill="#4285F4" />
          <Path d="M20.5 4h-9L21 21h9z" fill="#FBBC04" />
          <Path d="M2 21l4.5 7h19l4.5-7z" fill="#34A853" />
          <Path d="M11.5 4l9.5 17h-9.5L6 11.5z" fill="#EA4335" opacity="0.25" />
        </Svg>
      );
      
    case 'dropbox':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <G fill="#0061FF">
            <Path d="M8 4l8 5.1-8 5.1-8-5.1z" />
            <Path d="M24 4l8 5.1-8 5.1-8-5.1z" />
            <Path d="M8 19.3l8 5.1-8 5.1-8-5.1z" />
            <Path d="M24 19.3l8 5.1-8 5.1-8-5.1z" />
            <Path d="M16 9.1l-8 5.1 8 5.1 8-5.1z" />
          </G>
        </Svg>
      );
      
    case 'onedrive':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Defs>
            <LinearGradient id="onedriveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#0364B8" />
              <Stop offset="100%" stopColor="#0078D4" />
            </LinearGradient>
            <LinearGradient id="onedriveGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#1490DF" />
              <Stop offset="100%" stopColor="#28A8EA" />
            </LinearGradient>
          </Defs>
          <Path
            d="M13 10c2.5-2.5 6.5-2.5 9 0 .8.8 1.4 1.8 1.7 2.9 2.6.5 4.3 2.9 3.8 5.5-.4 2.1-2.2 3.6-4.3 3.6H9c-3.3 0-6-2.7-6-6 0-2.7 1.8-5 4.4-5.7.3-.1.6-.2.9-.2 1.7-.1 3.4.6 4.7 1.9z"
            fill="url(#onedriveGrad1)"
          />
          <Path
            d="M24.2 13c-.3-1.1-.9-2.1-1.7-2.9-2.5-2.5-6.5-2.5-9 0-1.3-1.3-3-2-4.7-1.9-.3 0-.6.1-.9.2C5.8 9 4 11.3 4 14c0 1 .2 2 .7 2.9 1.2-.9 2.6-1.4 4.1-1.4h14.5c.3-1 .5-1.7.9-2.5z"
            fill="url(#onedriveGrad2)"
          />
        </Svg>
      );
      
    case 'box':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Rect x="4" y="4" width="24" height="24" rx="4" fill="#0061D5" />
          <Path
            d="M16 8L8 13v6l8 5 8-5v-6l-8-5zm0 2.5l5.5 3.5-5.5 3.5-5.5-3.5L16 10.5z"
            fill="white"
          />
        </Svg>
      );
      
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          <Circle cx="16" cy="16" r="14" fill="#6B7280" />
          <Path
            d="M21 14c0-.2 0-.3-.1-.5-.2-2.6-2.4-4.5-5-4.5-2 0-3.8 1.2-4.6 3-.3-.1-.6-.2-.9-.2-1.4 0-2.5 1.1-2.5 2.5 0 .3.1.5.1.8-1.1.5-1.9 1.6-1.9 2.9 0 1.8 1.5 3.2 3.3 3.2h10.3c1.7 0 3-1.3 3-3 0-1.6-1.2-2.9-2.7-3-.3-.6-.7-1.1-1-1.2z"
            fill="white"
          />
        </Svg>
      );
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CloudProviderIcon;
