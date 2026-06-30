import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useThemeTokens } from '@/src/theme/colors';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://66a22b5f31faeb50f52f1bd84ebcc3fe@o4511450082377728.ingest.de.sentry.io/4511450089848912',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(function RootLayout() {
  const tokens = useThemeTokens();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={tokens.statusBar} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="habit/new" />
          <Stack.Screen name="habit/[id]" />
          <Stack.Screen name="habit/edit/[id]" />
          <Stack.Screen name="today-progress" />
          <Stack.Screen name="archive" />
          <Stack.Screen name="premium" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
});
