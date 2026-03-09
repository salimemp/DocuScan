import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Platform, View, TouchableOpacity, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { colors, shadows } = useTheme();
  const router = useRouter();
  const fabBottom = Platform.OS === 'ios' ? 92 : 72;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 0.5,
            height: Platform.OS === 'ios' ? 85 : 65,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            paddingTop: 10,
            elevation: 0,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="math-solver"
          options={{
            title: 'Math Solver',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'calculator' : 'calculator-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'time' : 'time-outline'} size={24} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Floating Scan FAB */}
      <TouchableOpacity
        testID="fab-scan-btn"
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: fabBottom, ...shadows.lg },
        ]}
        onPress={() => router.push('/scan')}
        activeOpacity={0.85}
        accessibilityLabel="Scan document"
      >
        <Ionicons name="scan-outline" size={27} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
});
