import React from 'react';
import { Stack } from 'expo-router';

export default function BlogLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="best-document-scanner-app-2026" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="scan-to-pdf-with-ocr" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="business-card-scanner-guide" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="math-equation-solver-camera" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
