import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useThemeTokens } from '@/src/theme/colors';

export default function TabLayout() {
  const tokens = useThemeTokens();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.primary,
        tabBarInactiveTintColor: tokens.textMuted,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          backgroundColor: tokens.tabBar,
          borderTopColor: tokens.border,
        },
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: ({ color, size }) => <Ionicons name="sunny" size={size} color={color} /> }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} /> }} />
      <Tabs.Screen name="assistant" options={{ title: 'Assistant', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> }} />
    </Tabs>
  );
}
