import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenShell } from '@/src/components/screen-shell';
import {
  AuthProvider,
  clearPendingPasswordlessEmail,
  completePasswordlessSignIn,
  getCurrentAuthUrl,
  getNativeGoogleErrorMessage,
  getPendingPasswordlessEmail,
  isPasswordlessEmailLink,
  sendPasswordlessSignInEmail,
  signInWithNativeGoogle,
} from '@/src/lib/auth';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

const authSlides = [
  {
    title: 'Build',
    accent: 'good habits',
    accentColor: '#8dd13f',
    body: 'Daily nudges, flexible streaks, and a calmer routine that fits real life.',
    mood: 'happy' as const,
  },
  {
    title: 'Break',
    accent: 'bad habits',
    accentColor: '#c21478',
    body: 'Spot patterns early and redirect your energy before the slip becomes a streak.',
    mood: 'sad' as const,
  },
];

type BusyState = 'email' | 'google' | 'guest' | 'email-link' | null;

export default function AuthScreen() {
  const tokens = useThemeTokens();
  const startFirebaseSession = useAppStore((state) => state.startFirebaseSession);
  const continueAsGuest = useAppStore((state) => state.continueAsGuest);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const onboardingComplete = useAppStore((state) => state.preferences.onboardingComplete);
  const [email, setEmail] = useState('');
  const [manualLink, setManualLink] = useState('');
  const [busy, setBusy] = useState<BusyState>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [step, setStep] = useState<'start' | 'sent'>('start');
  const [slideIndex, setSlideIndex] = useState(0);

  const activeSlide = authSlides[slideIndex];
  const canSubmitEmail = email.trim().length > 3;
  const canSubmitManualLink = manualLink.trim().length > 10;

  const guestButtonLabel = useMemo(() => (busy === 'guest' ? 'Opening guest mode...' : 'Continue as Guest'), [busy]);

  useEffect(() => {
    let cancelled = false;

    async function hydratePendingLink() {
      const pendingEmail = await getPendingPasswordlessEmail();
      const initialUrl = getCurrentAuthUrl();

      if (!cancelled && pendingEmail) {
        setEmail(pendingEmail);
        setStep('sent');
      }

      if (!cancelled && initialUrl && isPasswordlessEmailLink(initialUrl) && pendingEmail) {
        setBusy('email-link');
        await finishEmailLinkSignIn(pendingEmail, initialUrl);
      }
    }

    hydratePendingLink().catch((nextError) => {
      if (!cancelled) {
        setError(getNativeGoogleErrorMessage(nextError));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function finishAuth(action: () => Promise<{ uid: string; email?: string; displayName?: string; provider: AuthProvider }>) {
    setError(null);
    setInfo(null);
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

  async function handleSendEmailLink() {
    if (!canSubmitEmail) {
      setError('Enter a valid email address to continue.');
      return;
    }

    setBusy('email');
    setError(null);
    setInfo(null);

    try {
      const normalizedEmail = await sendPasswordlessSignInEmail(email);
      setEmail(normalizedEmail);
      setStep('sent');
      setInfo(`We sent a secure sign-in link to ${normalizedEmail}. Open it on this device, or paste it below if email opens in another app.`);
    } catch (nextError) {
      setError(getNativeGoogleErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }

  async function finishEmailLinkSignIn(nextEmail: string, emailLink: string) {
    setError(null);
    setInfo(null);
    try {
      const result = await completePasswordlessSignIn(nextEmail, emailLink);
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
    <ScreenShell title="HabitAI" subtitle="Build the account flow once, then keep tracking with or without sign-in.">
      <View style={[styles.hero, { backgroundColor: tokens.mode === 'light' ? '#131822' : '#0a0e17', borderColor: tokens.border }]}>
        <View style={styles.heroArt}>
          <View style={[styles.orb, activeSlide.mood === 'happy' ? styles.orbHappy : styles.orbSad]}>
            <View style={styles.orbStemRow}>
              <View style={styles.orbStem} />
              <View style={[styles.orbStem, styles.orbStemTall]} />
              <View style={styles.orbStem} />
            </View>
            <View style={styles.orbEyeRow}>
              <View style={styles.orbEye} />
              <View style={styles.orbEye} />
            </View>
            <Text style={styles.orbMouth}>{activeSlide.mood === 'happy' ? '◡' : '︵'}</Text>
          </View>
          <View style={[styles.floatBubble, styles.floatBubbleLeft, { backgroundColor: activeSlide.mood === 'happy' ? '#3b2411' : '#6f1d3b' }]} />
          <View style={[styles.floatBubble, styles.floatBubbleRight, { backgroundColor: activeSlide.mood === 'happy' ? '#21273a' : '#2b3044' }]} />
        </View>

        <View style={styles.copyStack}>
          <Text style={[styles.heroTitle, { color: '#f7f9fc' }]}>{activeSlide.title}</Text>
          <Text style={[styles.heroAccent, { color: activeSlide.accentColor }]}>{activeSlide.accent}</Text>
          <Text style={[styles.heroBody, { color: '#9ca6bb' }]}>{activeSlide.body}</Text>
        </View>

        <View style={styles.dotsRow}>
          {authSlides.map((slide, index) => {
            const active = index === slideIndex;
            return (
              <Pressable
                key={slide.title}
                accessibilityRole="button"
                accessibilityLabel={`Show ${slide.title.toLowerCase()} slide`}
                onPress={() => setSlideIndex(index)}
                style={[styles.dot, { backgroundColor: active ? slide.accentColor : '#545d73' }]}
              />
            );
          })}
        </View>

        <Pressable
          onPress={handleSendEmailLink}
          style={[styles.primaryAction, { backgroundColor: '#cf224f', opacity: busy ? 0.8 : 1 }]}
        >
          {busy === 'email' ? <ActivityIndicator color="#fff8fb" /> : <Ionicons color="#fff8fb" name="mail" size={18} />}
          <Text style={styles.primaryActionLabel}>Continue with Email</Text>
        </Pressable>

        <View style={styles.socialRow}>
          <Pressable
            onPress={() => {
              setBusy('google');
              finishAuth(signInWithNativeGoogle);
            }}
            style={[styles.secondaryAction, { borderColor: '#343a49', backgroundColor: 'rgba(17,21,30,0.55)' }]}
          >
            {busy === 'google' ? <ActivityIndicator color="#f7f9fc" /> : <Ionicons color="#fbbc05" name="logo-google" size={22} />}
          </Pressable>
          <Pressable
            onPress={handleGuestContinue}
            style={[styles.secondaryAction, { borderColor: '#343a49', backgroundColor: 'rgba(17,21,30,0.55)' }]}
          >
            {busy === 'guest' ? <ActivityIndicator color="#f7f9fc" /> : <Ionicons color="#f7f9fc" name="person-outline" size={22} />}
          </Pressable>
        </View>

        <Text style={[styles.termsText, { color: '#697286' }]}>By continuing you agree to HabitAI&apos;s</Text>
        <Text style={[styles.termsLink, { color: '#8dd13f' }]}>Terms of Service & Privacy Policy</Text>
      </View>

      <View style={[styles.sheet, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <Text style={[styles.sheetTitle, { color: tokens.text }]}>Passwordless email sign-in</Text>
        <Text style={[styles.sheetBody, { color: tokens.textMuted }]}>
          Firebase on this app currently supports a secure email link flow. It feels like OTP entry, but the email contains a sign-in link instead of a numeric code.
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={tokens.textMuted}
          style={[styles.input, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border, color: tokens.text }]}
        />

        <Pressable
          onPress={handleSendEmailLink}
          style={[styles.inlineButton, { backgroundColor: tokens.primary, opacity: canSubmitEmail ? 1 : 0.6 }]}
        >
          <Text style={[styles.inlineButtonLabel, { color: tokens.mode === 'light' ? '#ffffff' : '#04111f' }]}>
            {busy === 'email' ? 'Sending...' : step === 'sent' ? 'Resend sign-in email' : 'Send sign-in email'}
          </Text>
        </Pressable>

        {step === 'sent' ? (
          <>
            <Text style={[styles.sheetCaption, { color: tokens.textMuted }]}>Paste the email link here if the app does not auto-open after you tap it.</Text>
            <TextInput
              value={manualLink}
              onChangeText={setManualLink}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Paste Firebase sign-in link"
              placeholderTextColor={tokens.textMuted}
              style={[styles.input, styles.linkInput, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border, color: tokens.text }]}
            />
            <Pressable
              onPress={() => {
                setBusy('email-link');
                finishEmailLinkSignIn(email, manualLink);
              }}
              style={[styles.inlineButton, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border, borderWidth: 1, opacity: canSubmitManualLink ? 1 : 0.6 }]}
            >
              <Text style={[styles.inlineButtonLabel, { color: tokens.text }]}>{busy === 'email-link' ? 'Signing in...' : 'Complete sign-in from link'}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                clearPendingPasswordlessEmail().catch(() => undefined);
                setStep('start');
                setManualLink('');
                setInfo(null);
              }}
              style={styles.textAction}
            >
              <Text style={[styles.textActionLabel, { color: tokens.textMuted }]}>Start over with a different email</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      {info ? (
        <View style={[styles.noticeBox, { backgroundColor: tokens.primarySoft, borderColor: tokens.primary }]}>
          <Text style={[styles.noticeText, { color: tokens.text }]}>{info}</Text>
        </View>
      ) : null}

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

      <Text style={[styles.bottomHint, { color: tokens.textMuted }]}>
        Guest mode keeps your habits on this device. Google or email will mark the session ready for sync.
      </Text>
      <Pressable
        onPress={handleGuestContinue}
        style={[styles.bottomGuestButton, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border }]}
      >
        <Ionicons color={tokens.text} name="person-outline" size={18} />
        <Text style={[styles.bottomGuestLabel, { color: tokens.text }]}>{guestButtonLabel}</Text>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 32,
    padding: 20,
    gap: 14,
    overflow: 'hidden',
  },
  heroArt: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    width: 138,
    height: 138,
    borderRadius: 999,
    backgroundColor: '#b01363',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  orbHappy: {
    transform: [{ rotate: '-4deg' }],
  },
  orbSad: {
    transform: [{ rotate: '4deg' }],
  },
  orbStemRow: {
    position: 'absolute',
    top: -22,
    flexDirection: 'row',
    gap: 8,
  },
  orbStem: {
    width: 8,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#c71762',
  },
  orbStemTall: {
    height: 44,
  },
  orbEyeRow: {
    flexDirection: 'row',
    gap: 30,
    marginTop: 14,
  },
  orbEye: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#fff7f8',
  },
  orbMouth: {
    marginTop: 14,
    color: '#fff7f8',
    fontSize: 26,
    fontWeight: '800',
  },
  floatBubble: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.85,
  },
  floatBubbleLeft: {
    width: 74,
    height: 34,
    left: 20,
    bottom: 34,
  },
  floatBubbleRight: {
    width: 48,
    height: 48,
    right: 14,
    top: 32,
  },
  copyStack: {
    gap: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  heroAccent: {
    fontSize: 22,
    fontWeight: '800',
  },
  heroBody: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  primaryAction: {
    minHeight: 54,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  primaryActionLabel: {
    color: '#fff8fb',
    fontSize: 16,
    fontWeight: '800',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  termsLink: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
  },
  sheet: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  sheetCaption: {
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  linkInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  inlineButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  inlineButtonLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  textAction: {
    alignItems: 'center',
    paddingTop: 2,
  },
  textActionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
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
  bottomHint: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
  },
  bottomGuestButton: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bottomGuestLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
});
