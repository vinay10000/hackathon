import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AuthProvider,
  getNativeGoogleErrorMessage,
  signInWithNativeGoogle,
} from '@/src/lib/auth';
import { useAppStore } from '@/src/store/app-store';

const authBackground = require('@/assets/images/auth-moonlake-bg.png');

type BusyState = 'google' | 'guest' | null;

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const startFirebaseSession = useAppStore((state) => state.startFirebaseSession);
  const continueAsGuest = useAppStore((state) => state.continueAsGuest);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const [busy, setBusy] = useState<BusyState>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    if (busy) {
      return;
    }
    setError(null);
    setBusy('google');
    try {
      const result = await signInWithNativeGoogle();
      startFirebaseSession({
        mode: result.provider,
        uid: result.uid,
        email: result.email,
        displayName: result.displayName,
        emailVerified: result.emailVerified,
      });
      router.replace('/today');
    } catch (nextError) {
      setError(getNativeGoogleErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }

  function handleGuestContinue() {
    if (busy) {
      return;
    }
    setBusy('guest');
    setError(null);
    completeOnboarding();
    continueAsGuest();
    router.replace('/today');
  }

  return (
    <View style={styles.container}>
      <ImageBackground source={authBackground} resizeMode="cover" style={styles.background}>
        <LinearGradient
          colors={['rgba(4, 12, 26, 0.30)', 'rgba(4, 12, 26, 0.45)', 'rgba(3, 9, 20, 0.86)']}
          locations={[0, 0.46, 0.92]}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
            <View style={[styles.content, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}> 
              <View style={styles.hero}>
                <View style={styles.logoHalo} />
                <View style={styles.logoMark}>
                  <Ionicons name="leaf" size={42} color="#99f6e4" />
                </View>
                <Text style={styles.kicker}>You are all set</Text>
                <Text style={styles.wordmark}>HabitAI</Text>
                <Text style={styles.tagline}>Sign in to sync your progress, or start privately on this device.</Text>
              </View>

              <View style={styles.actionCard}>
                <View style={styles.actionHeader}>
                  <Text style={styles.actionTitle}>Choose how to begin</Text>
                  <Text style={styles.actionSubtitle}>You can switch accounts anytime in settings.</Text>
                </View>

                <View style={styles.actionStack}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in with Google"
                accessibilityState={{ busy: busy === 'google', disabled: busy !== null }}
                disabled={busy !== null}
                onPress={handleGoogleSignIn}
                style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed, busy !== null && styles.buttonDisabled]}
              >
                {busy === 'google' ? (
                  <ActivityIndicator color="#10243e" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={22} color="#4285f4" />
                    <Text style={styles.googleButtonText}>Sign in with Google</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue as guest"
                accessibilityState={{ busy: busy === 'guest', disabled: busy !== null }}
                disabled={busy !== null}
                onPress={handleGuestContinue}
                style={({ pressed }) => [styles.guestButton, pressed && styles.buttonPressed, busy !== null && styles.buttonDisabled]}
              >
                {busy === 'guest' ? (
                  <ActivityIndicator color="#9cc6ff" />
                ) : (
                  <>
                    <Text style={styles.guestText}>Continue as guest</Text>
                    <Ionicons name="arrow-forward" size={18} color="#9cc6ff" />
                  </>
                )}
              </Pressable>

                <Text style={styles.reassurance}>No account needed · Your habits stay on your device</Text>
              </View>
            </View>
          </View>

          {error ? <FeedbackCard text={error} /> : null}
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

function FeedbackCard({ text }: { text: string }) {
  return (
    <View style={styles.feedbackCard}>
      <View style={styles.feedbackIconWrap}>
        <Ionicons name="alert-circle" size={18} color="#fda4af" />
      </View>
      <Text style={styles.feedbackText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07111f',
  },
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  hero: {
    alignItems: 'center',
    marginTop: 56,
    gap: 12,
  },
  logoHalo: {
    position: 'absolute',
    top: -24,
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: 'rgba(45, 212, 191, 0.18)',
    transform: [{ scale: 0.92 }],
  },
  logoMark: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 18, 35, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(153, 246, 228, 0.26)',
    shadowColor: '#0f766e',
    shadowOpacity: 0.42,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  kicker: {
    marginTop: 4,
    color: '#99f6e4',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  wordmark: {
    color: '#f7fbff',
    fontSize: 50,
    lineHeight: 56,
    fontWeight: '600',
    letterSpacing: -1.3,
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' }),
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    maxWidth: 300,
    color: 'rgba(235, 243, 255, 0.86)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionCard: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.18)',
    backgroundColor: 'rgba(5, 16, 32, 0.68)',
    padding: 16,
    shadowColor: '#020617',
    shadowOpacity: 0.34,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  actionHeader: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  actionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  actionSubtitle: {
    color: 'rgba(203, 213, 225, 0.68)',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionStack: {
    gap: 14,
  },
  googleButton: {
    minHeight: 64,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    shadowColor: '#08162c',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  googleButtonText: {
    color: '#101828',
    fontSize: 17,
    fontWeight: '600',
  },
  guestButton: {
    minHeight: 54,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  guestText: {
    color: '#b9d6ff',
    fontSize: 16,
    fontWeight: '600',
  },
  reassurance: {
    color: 'rgba(182, 199, 223, 0.7)',
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 2,
  },
  feedbackCard: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(253, 164, 175, 0.25)',
    backgroundColor: 'rgba(127, 29, 29, 0.32)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  feedbackIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127, 29, 29, 0.4)',
  },
  feedbackText: {
    flex: 1,
    color: '#ffe4e6',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.62,
  },
});
