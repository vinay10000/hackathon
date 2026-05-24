import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { createAccountWithEmail, getNativeGoogleErrorMessage, signInWithEmail, signInWithNativeGoogle } from '@/src/lib/auth';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

export default function AuthScreen() {
  const tokens = useThemeTokens();
  const startFirebaseSession = useAppStore((state) => state.startFirebaseSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'email' | 'create' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function finishAuth(action: () => Promise<{ uid: string; email?: string; displayName?: string; provider: 'email' | 'google' }>) {
    setError(null);
    try {
      const result = await action();
      startFirebaseSession({
        mode: result.provider,
        uid: result.uid,
        email: result.email,
        displayName: result.displayName,
      });
      router.replace('/(tabs)/today');
    } catch (nextError) {
      setError(getNativeGoogleErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScreenShell title="Sign in" subtitle="Use a native-feeling account flow. Email stays in-app; Google uses the Android account picker when Firebase OAuth is ready.">
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <Text style={[styles.title, { color: tokens.text }]}>Email account</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="email@example.com"
          placeholderTextColor={tokens.textMuted}
          style={[styles.input, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border, color: tokens.text }]}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={tokens.textMuted}
          style={[styles.input, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border, color: tokens.text }]}
        />
        <View style={styles.row}>
          <PrimaryButton
            label="Sign in"
            onPress={() => {
              setBusy('email');
              finishAuth(() => signInWithEmail(email, password));
            }}
          />
          <PrimaryButton
            label="Create account"
            tone="secondary"
            onPress={() => {
              setBusy('create');
              finishAuth(() => createAccountWithEmail(email, password));
            }}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <Text style={[styles.title, { color: tokens.text }]}>Google on Android</Text>
        <Text style={[styles.body, { color: tokens.textMuted }]}>This uses native Google Sign-In, not Firebase's browser redirect flow.</Text>
        <PrimaryButton
          label="Continue with Google"
          tone="secondary"
          onPress={() => {
            setBusy('google');
            finishAuth(signInWithNativeGoogle);
          }}
        />
        <Text style={[styles.body, { color: tokens.textMuted }]}>If Google fails with an ID-token/client error, add SHA-1/SHA-256 in Firebase, re-download `google-services.json`, then rebuild.</Text>
      </View>

      {busy ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={tokens.primary} />
          <Text style={[styles.body, { color: tokens.textMuted }]}>Working on {busy} sign-in...</Text>
        </View>
      ) : null}

      {error ? <Text style={[styles.error, { color: tokens.danger }]}>{error}</Text> : null}
      <PrimaryButton label="Continue as guest" tone="secondary" onPress={() => router.replace('/(tabs)/today')} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  body: {
    lineHeight: 21,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  error: {
    fontWeight: '700',
    lineHeight: 20,
  },
});
