import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { createAccountWithEmail, getNativeGoogleErrorMessage, signInWithEmail, signInWithNativeGoogle } from '@/src/lib/auth';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

const accountBenefits = ['Future sync-ready', 'Private by default', 'Guest mode stays available'];

export default function AuthScreen() {
  const tokens = useThemeTokens();
  const startFirebaseSession = useAppStore((state) => state.startFirebaseSession);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
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

  function continueAsGuest() {
    completeOnboarding();
    router.replace('/(tabs)/today');
  }

  return (
    <ScreenShell title="Sign in" subtitle="Choose an account for future sync, or keep tracking locally as a guest.">
      <View style={[styles.hero, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={styles.heroHeader}>
          <Text style={[styles.eyebrow, { backgroundColor: tokens.primarySoft, color: tokens.primary }]}>Account optional</Text>
          {busy ? (
            <View style={styles.inlineStatus}>
              <ActivityIndicator color={tokens.primary} />
              <Text style={[styles.inlineStatusText, { color: tokens.textMuted }]}>{busy}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.heroTitle, { color: tokens.text }]}>Keep habits personal. Sign in when it helps.</Text>
        <View style={styles.benefits}>
          {accountBenefits.map((benefit) => (
            <View key={benefit} style={[styles.benefitPill, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border }]}>
              <Text style={[styles.benefitText, { color: tokens.text }]}>{benefit}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.title, { color: tokens.text }]}>Google</Text>
          <Text style={[styles.cardMeta, { color: tokens.textMuted }]}>Native Android</Text>
        </View>
        <PrimaryButton
          label="Continue with Google"
          tone="secondary"
          onPress={() => {
            setBusy('google');
            finishAuth(signInWithNativeGoogle);
          }}
        />
        <Text style={[styles.body, { color: tokens.textMuted }]}>Uses the Android account picker. If Firebase signing keys are missing, the app will show a clear error.</Text>
      </View>

      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.title, { color: tokens.text }]}>Email</Text>
          <Text style={[styles.cardMeta, { color: tokens.textMuted }]}>Sign in or create</Text>
        </View>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
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

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: tokens.mode === 'light' ? '#fee2e2' : '#3a1118', borderColor: tokens.danger }]}>
          <Text style={[styles.error, { color: tokens.danger }]}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.guestCard, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border }]}>
        <Text style={[styles.guestTitle, { color: tokens.text }]}>Just want to start?</Text>
        <Text style={[styles.body, { color: tokens.textMuted }]}>Guest mode keeps your habits on this device and does not block manual tracking.</Text>
        <PrimaryButton label="Continue as guest" tone="secondary" onPress={continueAsGuest} />
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={[styles.backLinkText, { color: tokens.textMuted }]}>Back to intro</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  heroHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  benefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  benefitPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  benefitText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: '700',
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
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  error: {
    fontWeight: '700',
    lineHeight: 20,
  },
  guestCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 10,
  },
  guestTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  backLink: {
    alignItems: 'center',
    paddingTop: 2,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
