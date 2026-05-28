import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/src/components/screen-shell';
import { AuthProvider, getNativeGoogleErrorMessage, signInWithNativeGoogle } from '@/src/lib/auth';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

const authSlides = [
  {
    eyebrow: 'Build good habits',
    title: 'Keep it simple.',
    body: 'Track daily. Stay steady.',
    accent: '#8dd13f',
    glow: '#1e3520',
  },
  {
    eyebrow: 'Break bad habits',
    title: 'See the pattern.',
    body: 'Notice it. Interrupt it.',
    accent: '#ff5d8f',
    glow: '#3f1a29',
  },
];

type BusyState = 'google' | 'guest' | null;

export default function AuthScreen() {
  const tokens = useThemeTokens();
  const startFirebaseSession = useAppStore((state) => state.startFirebaseSession);
  const continueAsGuest = useAppStore((state) => state.continueAsGuest);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const onboardingComplete = useAppStore((state) => state.preferences.onboardingComplete);
  const [busy, setBusy] = useState<BusyState>(null);
  const [error, setError] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  const activeSlide = authSlides[slideIndex];
  const guestButtonLabel = useMemo(() => (busy === 'guest' ? 'Opening...' : 'Continue as guest'), [busy]);

  async function finishAuth(action: () => Promise<{ uid: string; email?: string; displayName?: string; provider: AuthProvider }>) {
    setError(null);
    try {
      const result = await action();
      startFirebaseSession({
        mode: result.provider,
        uid: result.uid,
        email: result.email,
        displayName: result.displayName,
      });
      router.replace('/today');
    } catch (nextError) {
      setError(getNativeGoogleErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }

  function handleGuestContinue() {
    setBusy('guest');
    completeOnboarding();
    continueAsGuest();
    router.replace('/today');
  }

  return (
    <ScreenShell title="HabitAI" subtitle="Start clean.">
      <View style={[styles.hero, { backgroundColor: tokens.mode === 'light' ? '#101620' : '#05080d', borderColor: tokens.border }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.eyebrow, { color: activeSlide.accent }]}>{activeSlide.eyebrow}</Text>
            <Text style={styles.heroTitle}>{activeSlide.title}</Text>
            <Text style={styles.heroBody}>{activeSlide.body}</Text>
          </View>

          <View style={[styles.artWrap, { backgroundColor: activeSlide.glow }]}>
            <View style={[styles.ring, { borderColor: activeSlide.accent }]} />
            <View style={[styles.core, { backgroundColor: activeSlide.accent }]}>
              <Ionicons color="#081018" name={slideIndex === 0 ? 'checkmark' : 'remove'} size={28} />
            </View>
          </View>
        </View>

        <View style={styles.dotsRow}>
          {authSlides.map((slide, index) => {
            const active = index === slideIndex;
            return (
              <Pressable
                key={slide.eyebrow}
                accessibilityRole="button"
                accessibilityLabel={`Show ${slide.eyebrow.toLowerCase()} card`}
                onPress={() => setSlideIndex(index)}
                style={[styles.dot, { backgroundColor: active ? slide.accent : '#4c5568', width: active ? 22 : 8 }]}
              />
            );
          })}
        </View>

        <View style={styles.actionStack}>
          <Pressable
            onPress={() => {
              setBusy('google');
              finishAuth(signInWithNativeGoogle);
            }}
            style={[styles.primaryAction, { backgroundColor: '#f6f8fb', opacity: busy ? 0.82 : 1 }]}
          >
            {busy === 'google' ? <ActivityIndicator color="#111827" /> : <Ionicons color="#fbbc05" name="logo-google" size={20} />}
            <Text style={styles.primaryActionLabel}>Continue with Google</Text>
          </Pressable>

          <Pressable
            onPress={handleGuestContinue}
            style={[styles.secondaryAction, { borderColor: '#2e3647', backgroundColor: 'rgba(255,255,255,0.04)' }]}
          >
            {busy === 'guest' ? <ActivityIndicator color="#f7f9fc" /> : <Ionicons color="#f7f9fc" name="person-outline" size={18} />}
            <Text style={styles.secondaryActionLabel}>{guestButtonLabel}</Text>
          </Pressable>
        </View>

        <Text style={styles.legalText}>Terms • Privacy</Text>
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: tokens.mode === 'light' ? '#fee2e2' : '#3a1118', borderColor: tokens.danger }]}>
          <Text style={[styles.errorText, { color: tokens.danger }]}>{error}</Text>
        </View>
      ) : null}

      {onboardingComplete ? (
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={[styles.backLinkText, { color: tokens.textMuted }]}>Back</Text>
        </Pressable>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 32,
    padding: 22,
    gap: 20,
    overflow: 'hidden',
  },
  heroTop: {
    gap: 24,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: 10,
    color: '#f7f9fc',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  heroBody: {
    marginTop: 8,
    color: '#9ca6bb',
    fontSize: 15,
    lineHeight: 22,
  },
  artWrap: {
    height: 180,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 999,
    borderWidth: 1,
    opacity: 0.35,
  },
  core: {
    width: 92,
    height: 92,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  actionStack: {
    gap: 12,
  },
  primaryAction: {
    minHeight: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  primaryActionLabel: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryAction: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  secondaryActionLabel: {
    color: '#f7f9fc',
    fontSize: 15,
    fontWeight: '800',
  },
  legalText: {
    color: '#6f7a90',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  errorText: {
    fontWeight: '700',
    lineHeight: 20,
  },
  backLink: {
    alignItems: 'center',
    paddingTop: 4,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
