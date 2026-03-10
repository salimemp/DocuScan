import { View, ActivityIndicator } from 'react-native';

// This is a placeholder screen that shows while _layout.tsx handles navigation
// The actual redirection is handled in _layout.tsx based on Zustand store state
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}
