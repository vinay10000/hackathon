import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthProvider, getNativeGoogleErrorMessage, signInWithNativeGoogle } from '@/src/lib/auth';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

type BusyState = 'google' | 'guest' | null;

export default function AuthScreen() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const startFirebaseSession = useAppStore((state) => state.startFirebaseSession);
  const continueAsGuest = useAppStore((state) => state.continueAsGuest);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const onboardingComplete = useAppStore((state) => state.preferences.onboardingComplete);
  const [busy, setBusy] = useState<BusyState>(null);
  const [error, setError] = useState<string | null>(null);

  const isLight = tokens.mode === 'light';

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
    setError(null);
    completeOnboarding();
    continueAsGuest();
    router.replace('/today');
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isLight ? ['#f8fafc', '#f1f5f9', '#e2e8f0'] : ['#0f172a', '#1e293b', '#334155']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 32, 48) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.hero}>
            <View style={[styles.logoContainer, { backgroundColor: isLight ? '#ffffff' : '#1e293b' }]}>
              <Ionicons name="leaf" size={32} color={isLight ? '#84cc16' : '#a3e635'} />
            </View>

            <Text style={[styles.appTitle, { color: tokens.text }]}>HabitAI</Text>
            <Text style={[styles.tagline, { color: tokens.textMuted }]}>Build better habits, one day at a time</Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            {[
              { icon: 'checkmark-circle-outline', text: 'Track habits effortlessly' },
              { icon: 'trending-up-outline', text: 'Visualize your progress' },
              { icon: 'shield-checkmark-outline', text: 'Private and secure' },
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name={feature.icon as any} size={20} color={isLight ? '#84cc16' : '#a3e635'} />
                <Text style={[styles.featureText, { color: tokens.textMuted }]}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* Auth Actions */}
          <View style={styles.authActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
              accessibilityState={{ busy: busy === 'google', disabled: busy !== null }}
              disabled={busy !== null}
              onPress={() => {
                setBusy('google');
                finishAuth(signInWithNativeGoogle);
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: isLight ? '#ffffff' : '#1e293b' },
                pressed && styles.buttonPressed,
                busy !== null && styles.buttonDisabled,
              ]}
            >
              {busy === 'google' ? (
                <ActivityIndicator color={tokens.text} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={22} color="#4285f4" />
                  <Text style={[styles.primaryButtonText, { color: tokens.text }]}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
              <Text style={[styles.dividerText, { color: tokens.textMuted }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue as guest"
              accessibilityState={{ busy: busy === 'guest', disabled: busy !== null }}
              disabled={busy !== null}
              onPress={handleGuestContinue}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: tokens.border },
                pressed && styles.buttonPressed,
                busy !== null && styles.buttonDisabled,
              ]}
            >
              {busy === 'guest' ? (
                <ActivityIndicator color={tokens.text} />
              ) : (
                <>
                  <Ionicons name="person-outline" size={22} color={tokens.text} />
                  <Text style={[styles.secondaryButtonText, { color: tokens.text }]}>Continue as guest</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Error Message */}
          {error ? (
            <View
              accessibilityLiveRegion="polite"
              style={[styles.errorContainer, { backgroundColor: isLight ? '#fee2e2' : '#3a1118', borderColor: tokens.danger }]}
            >
              <Ionicons name="alert-circle" size={18} color={tokens.danger} />
              <Text style={[styles.errorText, { color: tokens.danger }]}>{error}</Text>
            </View>
          ) : null}

          {/* Footer */}
          <Text style={[styles.footerText, { color: tokens.textMuted }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>

          {onboardingComplete ? (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color={tokens.textMuted} />
              <Text style={[styles.backButtonText, { color: tokens.textMuted }]}>Back</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    gap: 40,
  },
  hero: {
    alignItems: 'center',
    gap: 16,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  appTitle: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 280,
  },
  features: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500',
  },
  authActions: {
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
