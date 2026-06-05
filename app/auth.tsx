import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AuthProvider,
  EmailVerificationRequiredError,
  getNativeGoogleErrorMessage,
  resendVerificationEmail,
  sendPasswordRecoveryEmail,
  signOutOfFirebase,
  signInWithEmailPassword,
  signInWithNativeGoogle,
  signUpWithEmailPassword,
} from '@/src/lib/auth';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

const authBackground = require('@/assets/images/auth-moonlake-bg.png');

type BusyState = 'google' | 'guest' | 'emailSignIn' | 'emailSignUp' | 'emailReset' | null;
type EmailMode = 'signIn' | 'signUp';

export default function AuthScreen() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const startFirebaseSession = useAppStore((state) => state.startFirebaseSession);
  const continueAsGuest = useAppStore((state) => state.continueAsGuest);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const onboardingComplete = useAppStore((state) => state.preferences.onboardingComplete);
  const [busy, setBusy] = useState<BusyState>(null);
  const [emailMode, setEmailMode] = useState<EmailMode>('signIn');
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function finishAuth(action: () => Promise<{ uid: string; email?: string; displayName?: string; emailVerified?: boolean; provider: AuthProvider }>) {
    setError(null);
    setSuccess(null);
    setPendingVerificationEmail(null);
    try {
      const result = await action();
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
    setBusy('guest');
    setError(null);
    setSuccess(null);
    setPendingVerificationEmail(null);
    completeOnboarding();
    continueAsGuest();
    router.replace('/today');
  }

  async function handleEmailSubmit() {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = displayName.trim();

    if (!normalizedEmail) {
      setError('Enter your email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    if (emailMode === 'signUp') {
      if (!trimmedName) {
        setError('Enter your name.');
        return;
      }
      if (password.length < 8) {
        setError('Use at least 8 characters for your password.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setError(null);
    setSuccess(null);
    setPendingVerificationEmail(null);
    setBusy(emailMode === 'signIn' ? 'emailSignIn' : 'emailSignUp');

    try {
      if (emailMode === 'signIn') {
        await finishAuth(() => signInWithEmailPassword({ email: normalizedEmail, password }));
        return;
      }

      const result = await signUpWithEmailPassword({
        email: normalizedEmail,
        password,
        displayName: trimmedName,
      });
      setSuccess('Verification link sent\nWe sent a link to your email.');
      setPassword('');
      setConfirmPassword('');
      setEmailMode('signIn');
    } catch (nextError) {
      if (nextError instanceof EmailVerificationRequiredError) {
        setPendingVerificationEmail(nextError.email);
        setSuccess(`Verification link sent\nCheck ${nextError.email}, then come back and sign in.`);
        return;
      }
      setError(getNativeGoogleErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }

  async function handleForgotPassword() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter your email first.');
      return;
    }

    setBusy('emailReset');
    setError(null);
    setSuccess(null);
    try {
      const result = await sendPasswordRecoveryEmail(normalizedEmail);
      setSuccess(`Reset email sent to ${result}.`);
    } catch (nextError) {
      setError(getNativeGoogleErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }

  async function handleResendPendingVerification() {
    if (!pendingVerificationEmail) {
      return;
    }

    setBusy('emailSignIn');
    setError(null);
    setSuccess(null);
    try {
      await resendVerificationEmail();
      setSuccess(`Verification link resent\nOpen ${pendingVerificationEmail} and finish verification before signing in.`);
    } catch (nextError) {
      setError(getNativeGoogleErrorMessage(nextError));
    } finally {
      await signOutOfFirebase();
      setBusy(null);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: '#07111f' }]}>
      <ImageBackground source={authBackground} resizeMode="cover" style={styles.background}>
        <View style={styles.overlay} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 28, 40) }]}
              showsVerticalScrollIndicator={false}
            >
              {emailOpen ? (
                <View style={styles.emailScreen}>
                  <View style={styles.emailScreenHeader}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Go back"
                      onPress={() => {
                        setEmailOpen(false);
                        setError(null);
                        setSuccess(null);
                      }}
                      style={styles.backIconButton}
                    >
                      <Ionicons name="arrow-back" size={22} color="#dbe8ff" />
                    </Pressable>
                    <View style={styles.emailBrand}>
                      <Ionicons name="leaf" size={24} color="#6ea8ff" />
                      <Text style={styles.emailBrandText}>HabitAI</Text>
                    </View>
                    <View style={styles.headerSpacer} />
                  </View>

                  <View style={styles.emailScreenBody}>
                    <View style={[styles.segmentedControl, styles.fullSegmentedControl, { borderColor: tokens.border }]}>
                      <Pressable
                        onPress={() => {
                          setEmailMode('signIn');
                          setError(null);
                          setSuccess(null);
                          setPendingVerificationEmail(null);
                        }}
                        style={[styles.segmentButton, styles.fullSegmentButton, emailMode === 'signIn' && styles.segmentButtonActive]}
                      >
                        <Text style={[styles.segmentText, emailMode === 'signIn' && styles.segmentTextActive]}>Sign in</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setEmailMode('signUp');
                          setError(null);
                          setSuccess(null);
                          setPendingVerificationEmail(null);
                        }}
                        style={[styles.segmentButton, styles.fullSegmentButton, emailMode === 'signUp' && styles.segmentButtonActive]}
                      >
                        <Text style={[styles.segmentText, emailMode === 'signUp' && styles.segmentTextActive]}>Create account</Text>
                      </Pressable>
                    </View>

                    <View style={styles.fieldStack}>
                      {emailMode === 'signUp' ? (
                        <AuthField
                          value={displayName}
                          onChangeText={setDisplayName}
                          placeholder="Name"
                          autoCapitalize="words"
                          icon="person-outline"
                        />
                      ) : null}

                      <AuthField
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        icon="mail-outline"
                      />

                      <AuthField
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Password"
                        secureTextEntry={!passwordVisible}
                        autoCapitalize="none"
                        autoComplete={emailMode === 'signUp' ? 'new-password' : 'password'}
                        icon="lock-closed-outline"
                        trailingIcon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                        onTrailingPress={() => setPasswordVisible((current) => !current)}
                      />

                      {emailMode === 'signUp' ? (
                        <AuthField
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          placeholder="Confirm password"
                          secureTextEntry={!confirmPasswordVisible}
                          autoCapitalize="none"
                          autoComplete="new-password"
                          icon="lock-closed-outline"
                          trailingIcon={confirmPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                          onTrailingPress={() => setConfirmPasswordVisible((current) => !current)}
                        />
                      ) : null}
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      disabled={busy !== null}
                      onPress={handleEmailSubmit}
                      style={({ pressed }) => [
                        styles.emailSubmitButton,
                        styles.emailScreenSubmitButton,
                        pressed && styles.buttonPressed,
                        busy !== null && styles.buttonDisabled,
                      ]}
                    >
                      {busy === 'emailSignIn' || busy === 'emailSignUp' ? (
                        <ActivityIndicator color="#eff6ff" />
                      ) : (
                        <Text style={styles.emailScreenSubmitText}>{emailMode === 'signIn' ? 'Continue with email' : 'Create verified account'}</Text>
                      )}
                    </Pressable>

                    {emailMode === 'signIn' ? (
                      <>
                        <Pressable disabled={busy !== null} onPress={handleForgotPassword} style={styles.forgotLink}>
                          {busy === 'emailReset' ? (
                            <ActivityIndicator color="#6ea8ff" size="small" />
                          ) : (
                            <Text style={styles.forgotLinkText}>Forgot password?</Text>
                          )}
                        </Pressable>
                        {pendingVerificationEmail ? (
                          <Pressable disabled={busy !== null} onPress={handleResendPendingVerification} style={styles.forgotLink}>
                            {busy === 'emailSignIn' ? (
                              <ActivityIndicator color="#6ea8ff" size="small" />
                            ) : (
                              <Text style={styles.forgotLinkText}>Resend verification email</Text>
                            )}
                          </Pressable>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.heroBlock}>
                    <View style={styles.logoMark}>
                      <Ionicons name="leaf" size={44} color="#6ea8ff" />
                    </View>
                    <Text style={styles.wordmark}>HabitAI</Text>
                    <Text style={styles.tagline}>Calm accountability{"\n"}for better habits.</Text>
                  </View>

                  <View style={styles.actionStack}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Continue with Google"
                      accessibilityState={{ busy: busy === 'google', disabled: busy !== null }}
                      disabled={busy !== null}
                      onPress={() => {
                        setBusy('google');
                        finishAuth(signInWithNativeGoogle);
                      }}
                      style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed, busy !== null && styles.buttonDisabled]}
                    >
                      {busy === 'google' ? (
                        <ActivityIndicator color="#10243e" />
                      ) : (
                        <>
                          <Ionicons name="logo-google" size={24} color="#4285f4" />
                          <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Continue with email"
                      accessibilityState={{ expanded: emailOpen, disabled: busy !== null }}
                      disabled={busy !== null}
                      onPress={() => {
                        setEmailOpen(true);
                        setEmailMode('signUp');
                        setError(null);
                        setSuccess(null);
                      }}
                      style={({ pressed }) => [
                        styles.emailEntryButton,
                        { borderColor: tokens.border },
                        pressed && styles.buttonPressed,
                        busy !== null && styles.buttonDisabled,
                      ]}
                    >
                      <View style={styles.emailEntryLeft}>
                        <View style={styles.emailIconShell}>
                          <Ionicons name="mail-outline" size={20} color="#f4f8ff" />
                        </View>
                        <Text style={styles.emailEntryText}>Continue with email</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#d9e7ff" />
                    </Pressable>

                    <View style={styles.orRow}>
                      <View style={styles.orLine} />
                      <Text style={styles.orText}>or</Text>
                      <View style={styles.orLine} />
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Continue as guest"
                      accessibilityState={{ busy: busy === 'guest', disabled: busy !== null }}
                      disabled={busy !== null}
                      onPress={handleGuestContinue}
                      style={({ pressed }) => [styles.guestButton, pressed && styles.buttonPressed, busy !== null && styles.buttonDisabled]}
                    >
                      {busy === 'guest' ? <ActivityIndicator color="#6ea8ff" /> : <Text style={styles.guestText}>Continue as guest</Text>}
                    </Pressable>
                  </View>
                </>
              )}

              {error ? <FeedbackCard kind="error" text={error} /> : null}
              {success ? <FeedbackCard kind="success" text={success} /> : null}

              {onboardingComplete ? (
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={18} color="#a9c1e5" />
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

function AuthField({
  icon,
  trailingIcon,
  onTrailingPress,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  trailingIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onTrailingPress?: () => void;
}) {
  return (
    <View style={styles.inputShell}>
      <Ionicons name={icon} size={20} color="#ceddf5" />
      <TextInput {...props} placeholderTextColor="#8aa3c8" style={styles.input} />
      {trailingIcon ? (
        <Pressable accessibilityRole="button" onPress={onTrailingPress} style={styles.trailingIconButton}>
          <Ionicons name={trailingIcon} size={20} color="#ceddf5" />
        </Pressable>
      ) : null}
    </View>
  );
}

function FeedbackCard({ kind, text }: { kind: 'error' | 'success'; text: string }) {
  const isError = kind === 'error';
  const [title, body] = text.split('\n');
  return (
    <View style={[styles.feedbackCard, isError ? styles.feedbackError : styles.feedbackSuccess]}>
      <View style={[styles.feedbackIconWrap, !isError && styles.feedbackSuccessIconWrap]}>
        <Ionicons name={isError ? 'alert-circle' : 'checkmark'} size={18} color={isError ? '#fda4af' : '#eff6ff'} />
      </View>
      <View style={styles.feedbackCopy}>
        <Text style={[styles.feedbackTitle, { color: isError ? '#ffe4e6' : '#eff6ff' }]}>{title}</Text>
        {body ? <Text style={[styles.feedbackBody, { color: isError ? '#fecdd3' : '#bcd0ef' }]}>{body}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(4, 14, 30, 0.34)',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  heroBlock: {
    alignItems: 'center',
    marginTop: 92,
    gap: 14,
  },
  logoMark: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  wordmark: {
    color: '#f7fbff',
    fontSize: 54,
    lineHeight: 60,
    fontWeight: '600',
    letterSpacing: -1.4,
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' }),
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    color: 'rgba(235, 243, 255, 0.88)',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '400',
  },
  actionStack: {
    gap: 16,
    marginTop: 28,
    marginBottom: 18,
  },
  emailScreen: {
    flexGrow: 1,
    paddingTop: 8,
  },
  emailScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginBottom: 26,
  },
  backIconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emailBrandText: {
    color: '#f5f9ff',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' }),
  },
  headerSpacer: {
    width: 34,
  },
  emailScreenBody: {
    gap: 16,
  },
  googleButton: {
    minHeight: 72,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
    shadowColor: '#08162c',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  googleButtonText: {
    color: '#101828',
    fontSize: 17,
    fontWeight: '600',
  },
  emailEntryButton: {
    minHeight: 72,
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: 'rgba(8, 23, 46, 0.56)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  emailEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  emailIconShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(244,248,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emailEntryText: {
    color: '#f4f8ff',
    fontSize: 17,
    fontWeight: '500',
  },
  emailSheet: {
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: 'rgba(7, 20, 40, 0.82)',
    padding: 16,
    gap: 12,
  },
  segmentedControl: {
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(110, 168, 255, 0.16)',
  },
  fullSegmentedControl: {
    minHeight: 58,
    borderRadius: 19,
    backgroundColor: 'rgba(5, 18, 38, 0.56)',
  },
  fullSegmentButton: {
    minHeight: 48,
    borderRadius: 15,
  },
  segmentText: {
    color: '#9bb4d8',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#eff6ff',
  },
  fieldStack: {
    gap: 16,
    marginTop: 10,
  },
  inputShell: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(11, 28, 53, 0.52)',
    borderWidth: 1,
    borderColor: 'rgba(151, 178, 214, 0.2)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 56,
    color: '#f8fbff',
    fontSize: 15,
    paddingRight: 8,
  },
  trailingIconButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailSubmitButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  emailSubmitText: {
    color: '#08162c',
    fontSize: 15,
    fontWeight: '700',
  },
  emailScreenSubmitButton: {
    minHeight: 60,
    borderRadius: 18,
    marginTop: 10,
    backgroundColor: '#3c74d7',
    borderWidth: 1,
    borderColor: 'rgba(142, 184, 255, 0.45)',
    shadowColor: '#4e86f2',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  emailScreenSubmitText: {
    color: '#eff6ff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotLink: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  forgotLinkText: {
    color: '#7eb2ff',
    fontSize: 14,
    fontWeight: '500',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(182, 199, 223, 0.24)',
  },
  orText: {
    color: 'rgba(182, 199, 223, 0.64)',
    fontSize: 15,
  },
  guestButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  guestText: {
    color: '#6ea8ff',
    fontSize: 17,
    fontWeight: '500',
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
  },
  feedbackError: {
    backgroundColor: 'rgba(127, 29, 29, 0.28)',
    borderColor: 'rgba(253, 164, 175, 0.25)',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(10, 26, 49, 0.64)',
    borderColor: 'rgba(122, 162, 234, 0.18)',
  },
  feedbackText: {
    flex: 1,
  },
  feedbackIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127, 29, 29, 0.32)',
  },
  feedbackSuccessIconWrap: {
    backgroundColor: 'rgba(60, 116, 215, 0.82)',
  },
  feedbackCopy: {
    flex: 1,
    gap: 4,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  backButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#a9c1e5',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  buttonDisabled: {
    opacity: 0.62,
  },
});
