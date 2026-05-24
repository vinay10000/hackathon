import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useThemeTokens } from '@/src/theme/colors';

export default function RootLayout() {
  const tokens = useThemeTokens();
  return (
    <>
      <StatusBar style={tokens.statusBar} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="habit/new" />
        <Stack.Screen name="habit/[id]" />
        <Stack.Screen name="habit/edit/[id]" />
        <Stack.Screen name="archive" />
      </Stack>
    </>
  );
}
