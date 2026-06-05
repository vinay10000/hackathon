import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReminderTimePopup } from '@/src/components/reminder-time-popup';
import { PROFILE_AVATARS } from '@/src/constants/profile';
import { refreshCurrentUserProfile, requestEmailChange, resendVerificationEmail, sendPasswordRecoveryEmail, signOutOfFirebase } from '@/src/lib/auth';
import { canScheduleNotifications, requestNotificationAccess } from '@/src/lib/notifications';
import { buildLocalDataExport, buildPrivacySafeTelemetry } from '@/src/lib/privacy-export';
import { useAppStore } from '@/src/store/app-store';
import { ThemeTokens, useThemeTokens } from '@/src/theme/colors';
import { ThemePreference } from '@/src/types/habits';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const THEME_OPTIONS: { label: string; value: ThemePreference; icon: IconName }[] = [
  { label: 'System', value: 'system', icon: 'desktop-outline' },
  { label: 'Light', value: 'light', icon: 'sunny-outline' },
  { label: 'Dark', value: 'dark', icon: 'moon' },
  { label: 'AMOLED', value: 'amoled', icon: 'color-filter-outline' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tokens = useThemeTokens();
  const settingsPalette = getSettingsPalette(tokens);
  const preferences = useAppStore((state) => state.preferences);
  const session = useAppStore((state) => state.session);
  const premium = useAppStore((state) => state.premium);
  const habits = useAppStore((state) => state.habits);
  const logs = useAppStore((state) => state.logs);
  const saveDailyReminderPreference = useAppStore((state) => state.saveDailyReminderPreference);
  const setProfile = useAppStore((state) => state.setProfile);
  const setTheme = useAppStore((state) => state.setTheme);
  const setNotificationPermission = useAppStore((state) => state.setNotificationPermission);
  const continueAsGuest = useAppStore((state) => state.continueAsGuest);
  const markSynced = useAppStore((state) => state.markSynced);
  const resetLocalData = useAppStore((state) => state.resetLocalData);
  const updateFirebaseSessionAccount = useAppStore((state) => state.updateFirebaseSessionAccount);
  const [dailyReminderOpen, setDailyReminderOpen] = useState(false);
  const [accountBusy, setAccountBusy] = useState<'refresh' | 'verify' | 'reset' | 'changeEmail' | null>(null);
  const [accountMessage, setAccountMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [nextEmail, setNextEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  const contentWidth = Math.min(width - 32, 430);
  const selectedAvatar = PROFILE_AVATARS.find((avatar) => avatar.id === preferences.profileAvatarId) ?? PROFILE_AVATARS[0];
  const notificationsOn = preferences.notificationPermission === 'granted';
  const bottomPadding = Math.max(insets.bottom, 16) + 132;

  async function toggleNotifications(value: boolean) {
    if (!value) {
      await saveDailyReminderPreference(preferences.dailyReminderTime, false);
      setNotificationPermission('denied');
      return;
    }

    const nextValue = await requestNotificationAccess();
    setNotificationPermission(nextValue);
    if (nextValue === 'granted' && preferences.dailyReminderEnabled) {
      await saveDailyReminderPreference(preferences.dailyReminderTime, true);
    }
  }

  useEffect(() => {
    if (session.mode !== 'email') {
      return;
    }

    let cancelled = false;
    setAccountBusy('refresh');
    refreshCurrentUserProfile()
      .then((profile) => {
        if (cancelled) {
          return;
        }
        updateFirebaseSessionAccount({
          email: profile.email,
          displayName: profile.displayName,
          emailVerified: profile.emailVerified,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setAccountBusy((current) => (current === 'refresh' ? null : current));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session.mode, updateFirebaseSessionAccount]);

  async function handleResendVerification() {
    setAccountBusy('verify');
    setAccountMessage(null);
    try {
      await resendVerificationEmail();
      setAccountMessage({ kind: 'success', text: 'Verification email sent. Open the link in your inbox, then come back here.' });
    } catch (error) {
      setAccountMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Could not send verification email.' });
    } finally {
      setAccountBusy(null);
    }
  }

  async function handlePasswordReset() {
    if (!session.email) {
      setAccountMessage({ kind: 'error', text: 'No account email found. Sign in again first.' });
      return;
    }

    setAccountBusy('reset');
    setAccountMessage(null);
    try {
      const email = await sendPasswordRecoveryEmail(session.email);
      setAccountMessage({ kind: 'success', text: `Password reset instructions sent to ${email}.` });
    } catch (error) {
      setAccountMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Could not send password reset email.' });
    } finally {
      setAccountBusy(null);
    }
  }

  async function handleEmailChange() {
    if (!nextEmail.trim()) {
      setAccountMessage({ kind: 'error', text: 'Enter the new email address you want to use.' });
      return;
    }
    if (!currentPassword) {
      setAccountMessage({ kind: 'error', text: 'Enter your current password to confirm the email change.' });
      return;
    }

    setAccountBusy('changeEmail');
    setAccountMessage(null);
    try {
      const email = await requestEmailChange({ newEmail: nextEmail, currentPassword });
      setAccountMessage({ kind: 'success', text: `Confirmation sent to ${email}. Your email updates after you verify it.` });
      setNextEmail('');
      setCurrentPassword('');
    } catch (error) {
      setAccountMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Could not start the email change.' });
    } finally {
      setAccountBusy(null);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={settingsPalette.backgroundGradient}
        locations={[0, 0.36, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.topAbyss, { backgroundColor: settingsPalette.topAbyss }]} />
      <View style={[styles.planetOuter, { borderColor: settingsPalette.orbit, shadowColor: settingsPalette.orbitGlow }]} />
      <View style={[styles.planetGlow, { backgroundColor: settingsPalette.orbitGlow, shadowColor: settingsPalette.orbitGlow }]} />
      <View style={styles.stars}>
        {Array.from({ length: 18 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.star,
              {
                left: `${8 + ((index * 17) % 86)}%`,
                top: 54 + ((index * 23) % 174),
                backgroundColor: settingsPalette.star,
                opacity: settingsPalette.starOpacity + (index % 5) * 0.05,
                transform: [{ scale: index % 4 === 0 ? 1.45 : 1 }],
              },
            ]}
          />
        ))}
      </View>

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding, width: contentWidth }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: tokens.text }]}>Settings</Text>
          </View>

          <GlassCard compact>
            <View style={styles.profileTop}>
              <View style={[styles.profileAvatarWrap, { shadowColor: selectedAvatar.glow }]}>
                <Image source={selectedAvatar.image} style={styles.profileAvatar} />
              </View>
              <View style={styles.profileCopy}>
                <Text style={styles.profileEyebrow}>Profile</Text>
                <TextInput
                  value={session.displayName ?? 'Friend'}
                  onChangeText={(displayName) => setProfile({ displayName })}
                  placeholder="Your name"
                  placeholderTextColor={tokens.textMuted}
                  style={[
                    styles.nameInput,
                    {
                      color: tokens.text,
                      backgroundColor: settingsPalette.input,
                      borderColor: tokens.border,
                    },
                  ]}
                />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarStrip}>
              {PROFILE_AVATARS.map((avatar) => {
                const selected = preferences.profileAvatarId === avatar.id;
                return (
                  <Pressable
                    key={avatar.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setProfile({ profileAvatarId: avatar.id })}
                      style={[
                        styles.avatarChoice,
                        { backgroundColor: settingsPalette.input, borderColor: tokens.border },
                        selected && { borderColor: tokens.primary, shadowColor: avatar.glow },
                      ]}
                  >
                    <Image source={avatar.image} style={styles.avatarChoiceImage} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </GlassCard>

          <GlassCard>
            <CardHeading icon="color-palette-outline" iconColor="#2f8fff" title="Theme" />
            <View style={[styles.themeTray, { backgroundColor: settingsPalette.input, borderColor: tokens.border }]}>
              {THEME_OPTIONS.map((option, index) => {
                const selected = preferences.theme === option.value;
                return (
                  <View key={option.value} style={styles.themeSlot}>
                    {index > 0 ? <View style={[styles.themeDivider, { backgroundColor: tokens.border }]} /> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setTheme(option.value)}
                      style={[
                        styles.themeOption,
                        selected && styles.themeOptionSelected,
                        selected && { backgroundColor: settingsPalette.selectedSoft, borderColor: tokens.primary, shadowColor: tokens.primary },
                      ]}
                    >
                      {option.value === 'amoled' ? (
                        <DottedRing active={selected} />
                      ) : (
                        <Ionicons name={option.icon} size={24} color={selected ? tokens.primary : tokens.textMuted} />
                      )}
                      <Text style={[styles.themeLabel, { color: tokens.textMuted }, selected && { color: tokens.primary }]}>{option.label}</Text>
                      <View style={[styles.radio, { borderColor: tokens.border }, selected && { borderColor: tokens.primary }]}>
                        {selected ? <View style={[styles.radioDot, { backgroundColor: tokens.primary }]} /> : null}
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <View style={styles.focusLine}>
              <Ionicons name="sparkles-outline" size={16} color={tokens.primary} />
              <Text style={[styles.focusText, { color: tokens.textMuted }]}>Designed for focus. Easy on your eyes.</Text>
            </View>
          </GlassCard>

          <GlassCard>
            <View style={styles.topRow}>
              <CardHeading icon="notifications-outline" iconColor="#a855f7" title="Reminders" subtitle="Stay on track" />
              <Switch
                value={notificationsOn}
                onValueChange={toggleNotifications}
                trackColor={{ false: 'rgba(34,48,75,0.9)', true: '#2e7dff' }}
                thumbColor="#ffffff"
                ios_backgroundColor="rgba(34,48,75,0.9)"
              />
            </View>
            <InsetRow
              icon="time-outline"
              label="Daily reminder"
              value={canScheduleNotifications() ? toMeridiemTime(preferences.dailyReminderTime) : 'Unavailable'}
              onPress={async () => {
                if (preferences.notificationPermission !== 'granted') {
                  const nextValue = await requestNotificationAccess();
                  setNotificationPermission(nextValue);
                  if (nextValue !== 'granted') {
                    return;
                  }
                }
                setDailyReminderOpen(true);
              }}
            />
          </GlassCard>

          <GlassCard>
            <View style={styles.topRow}>
              <CardHeading icon="shield-checkmark-outline" iconColor="#22c55e" title="Account security" subtitle="Verification, recovery, and email changes" />
            </View>
            {session.mode === 'email' ? (
              <View style={styles.accountSection}>
                <View style={[styles.accountSummary, { backgroundColor: settingsPalette.input, borderColor: tokens.border }]}>
                  <View style={styles.accountSummaryTop}>
                    <View style={styles.accountIdentity}>
                      <Text style={[styles.accountEmail, { color: tokens.text }]}>{session.email ?? 'Email account'}</Text>
                      <Text style={[styles.accountCaption, { color: tokens.textMuted }]}>
                        {session.emailVerified ? 'Verified and ready for sync.' : 'Verification pending. Confirm your inbox before relying on email sign-in.'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.verificationBadge,
                        { backgroundColor: session.emailVerified ? 'rgba(22,163,74,0.16)' : 'rgba(245,158,11,0.16)' },
                      ]}
                    >
                      <Text style={[styles.verificationBadgeText, { color: session.emailVerified ? '#16a34a' : '#d97706' }]}>
                        {session.emailVerified ? 'Verified' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  {!session.emailVerified ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleResendVerification}
                      style={[styles.accountAction, { borderColor: tokens.border }]}
                    >
                      <Text style={[styles.accountActionText, { color: tokens.primary }]}>
                        {accountBusy === 'verify' ? 'Sending...' : 'Resend verification email'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <Pressable accessibilityRole="button" onPress={handlePasswordReset} style={[styles.insetRow, { backgroundColor: settingsPalette.input, borderColor: tokens.border }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="key-outline" size={18} color={tokens.textMuted} />
                    <Text style={[styles.rowLabel, { color: tokens.text }]}>Password recovery</Text>
                  </View>
                  <Text style={[styles.rowValue, { color: tokens.primary }]}>{accountBusy === 'reset' ? 'Sending...' : 'Send reset email'}</Text>
                </Pressable>

                <View style={[styles.accountForm, { backgroundColor: settingsPalette.input, borderColor: tokens.border }]}>
                  <Text style={[styles.accountFormTitle, { color: tokens.text }]}>Change email address</Text>
                  <Text style={[styles.accountCaption, { color: tokens.textMuted }]}>We’ll verify the new address before switching your account.</Text>
                  <TextInput
                    value={nextEmail}
                    onChangeText={setNextEmail}
                    placeholder="New email address"
                    placeholderTextColor={tokens.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[styles.accountInput, { color: tokens.text, borderColor: tokens.border }]}
                  />
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Current password"
                    placeholderTextColor={tokens.textMuted}
                    autoCapitalize="none"
                    secureTextEntry
                    style={[styles.accountInput, { color: tokens.text, borderColor: tokens.border }]}
                  />
                  <Pressable accessibilityRole="button" onPress={handleEmailChange} style={[styles.accountPrimaryButton, { backgroundColor: tokens.primary }]}>
                    <Text style={styles.accountPrimaryButtonText}>{accountBusy === 'changeEmail' ? 'Starting...' : 'Verify new email'}</Text>
                  </Pressable>
                </View>

                {accountMessage ? (
                  <View
                    style={[
                      styles.accountFeedback,
                      {
                        backgroundColor: accountMessage.kind === 'error' ? 'rgba(127,29,29,0.14)' : 'rgba(22,101,52,0.14)',
                        borderColor: accountMessage.kind === 'error' ? tokens.danger : '#16a34a',
                      },
                    ]}
                  >
                    <Ionicons name={accountMessage.kind === 'error' ? 'alert-circle' : 'checkmark-circle'} size={18} color={accountMessage.kind === 'error' ? tokens.danger : '#16a34a'} />
                    <Text style={[styles.accountFeedbackText, { color: accountMessage.kind === 'error' ? tokens.danger : '#16a34a' }]}>{accountMessage.text}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={[styles.accountSummary, { backgroundColor: settingsPalette.input, borderColor: tokens.border }]}>
                <Text style={[styles.accountEmail, { color: tokens.text }]}>{session.mode === 'google' ? 'Google-managed account' : 'Guest mode'}</Text>
                <Text style={[styles.accountCaption, { color: tokens.textMuted }]}>
                  {session.mode === 'google'
                    ? 'Email verification, recovery, and address changes are managed by your Google account.'
                    : 'Switch to an email account from the auth screen if you want verified email security primitives.'}
                </Text>
              </View>
            )}
          </GlassCard>

          <GlassCard>
            <View style={styles.topRow}>
              <CardHeading icon="documents-outline" iconColor="#2f8fff" title="Help, legal, and data" subtitle="Support, terms, and data options" />
              <Ionicons name="chevron-forward" size={18} color="#9fafcf" />
            </View>
            <ListRow icon="help-circle-outline" label="Help center" />
            <ListRow icon="document-text-outline" label="Terms of service" />
            <ListRow icon="shield-checkmark-outline" label="Privacy policy" />
            <ListRow
              icon="download-outline"
              label="Export your data"
              onPress={() => {
                const exportData = buildLocalDataExport({ habits, logs, preferences, session, premium });
                Alert.alert('Export prepared', `Local JSON export is ready in memory (${exportData.length} characters).`);
              }}
            />
            <ListRow
              icon="trash-outline"
              label="Delete your account"
              destructive
              onPress={() => {
                buildPrivacySafeTelemetry('local_data_reset_requested', { habitCount: habits.length, logCount: logs.length });
                Alert.alert('Delete local data?', 'This clears local habits, logs, and assistant history on this device.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: resetLocalData },
                ]);
              }}
            />
          </GlassCard>

          <View style={styles.utilityRail}>
            <UtilityAction label={session.mode === 'guest' ? 'Sign in' : 'Switch account'} onPress={() => router.push('/auth')} />
            <UtilityAction
              label="Sign out"
              onPress={async () => {
                await signOutOfFirebase();
                continueAsGuest();
              }}
            />
            <UtilityAction label="Sync check" onPress={markSynced} />
          </View>
        </ScrollView>
        {dailyReminderOpen ? (
          <ReminderTimePopup
            initialTime={preferences.dailyReminderTime}
            inputSurface={settingsPalette.input}
            onCancel={() => setDailyReminderOpen(false)}
            onConfirm={async (time) => {
              await saveDailyReminderPreference(time, true);
              setDailyReminderOpen(false);
            }}
          />
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function GlassCard({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  const tokens = useThemeTokens();
  const settingsPalette = getSettingsPalette(tokens);

  return (
    <View style={[styles.card, { backgroundColor: settingsPalette.card, borderColor: tokens.border }, compact && styles.compactCard]}>
      {children}
    </View>
  );
}

function CardHeading({
  icon,
  iconColor,
  title,
  subtitle,
}: {
  icon: IconName;
  iconColor: string;
  title: string;
  subtitle?: string;
}) {
  const tokens = useThemeTokens();

  return (
    <View style={styles.heading}>
      <Ionicons name={icon} size={22} color={iconColor} />
      <View style={styles.headingCopy}>
        <Text style={[styles.cardTitle, { color: tokens.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.cardSubtitle, { color: tokens.textMuted }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function DottedRing({ active }: { active: boolean }) {
  const tokens = useThemeTokens();
  const colors = ['#55d7ff', '#32e0c4', '#f8dd63', '#ff8aba', '#d974ff', '#7ba4ff', '#55d7ff', '#32e0c4'];

  return (
    <View style={[styles.dottedRing, active && styles.dottedRingActive, active && { shadowColor: tokens.primary }]}>
      {colors.map((color, index) => (
        <View key={`${color}-${index}`} style={[styles.ringDot, { backgroundColor: color, transform: [{ rotate: `${index * 45}deg` }, { translateY: -11 }] }]} />
      ))}
    </View>
  );
}

function InsetRow({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress: () => void }) {
  const tokens = useThemeTokens();
  const settingsPalette = getSettingsPalette(tokens);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.insetRow, { backgroundColor: settingsPalette.input, borderColor: tokens.border }]}
    >
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={tokens.textMuted} />
        <Text style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, { color: tokens.primary }]}>{value}</Text>
        <Ionicons name="chevron-forward" size={17} color={tokens.textMuted} />
      </View>
    </Pressable>
  );
}

function ListRow({ icon, label, destructive = false, onPress }: { icon: IconName; label: string; destructive?: boolean; onPress?: () => void }) {
  const tokens = useThemeTokens();

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.listRow, { borderTopColor: tokens.border }]}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={19} color={destructive ? tokens.danger : tokens.textMuted} />
        <Text style={[styles.listLabel, { color: destructive ? tokens.danger : tokens.text }, destructive && styles.listLabelDestructive]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={destructive ? tokens.danger : tokens.textMuted} />
    </Pressable>
  );
}

function UtilityAction({ label, onPress }: { label: string; onPress: () => void }) {
  const tokens = useThemeTokens();
  const settingsPalette = getSettingsPalette(tokens);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.utilityButton, { backgroundColor: settingsPalette.input, borderColor: tokens.border }]}
    >
      <Text style={[styles.utilityText, { color: tokens.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

function getSettingsPalette(tokens: ThemeTokens) {
  if (tokens.mode === 'light') {
    return {
      backgroundGradient: ['#f7fbff', '#eef5ff', '#f4f7fb', '#edf3fb'] as const,
      topAbyss: 'rgba(216,229,246,0.48)',
      orbit: 'rgba(37,99,235,0.22)',
      orbitGlow: 'rgba(37,99,235,0.28)',
      star: '#2563eb',
      starOpacity: 0.08,
      card: 'rgba(255,255,255,0.88)',
      control: 'rgba(255,255,255,0.82)',
      input: 'rgba(245,249,255,0.92)',
      selectedSoft: 'rgba(37,99,235,0.10)',
      premiumGradient: ['rgba(255,255,255,0.92)', 'rgba(255,251,235,0.96)', 'rgba(254,243,199,0.72)'] as const,
    };
  }

  if (tokens.mode === 'amoled') {
    return {
      backgroundGradient: ['#000000', '#030303', '#000000', '#000000'] as const,
      topAbyss: 'rgba(0,0,0,0.64)',
      orbit: 'rgba(94,234,212,0.28)',
      orbitGlow: 'rgba(94,234,212,0.34)',
      star: '#5eead4',
      starOpacity: 0.1,
      card: 'rgba(5,5,5,0.92)',
      control: 'rgba(16,16,16,0.9)',
      input: 'rgba(16,16,16,0.86)',
      selectedSoft: 'rgba(94,234,212,0.12)',
      premiumGradient: ['rgba(250,204,21,0.11)', 'rgba(5,5,5,0.95)', 'rgba(250,204,21,0.07)'] as const,
    };
  }

  return {
    backgroundGradient: ['#010814', '#041225', '#020812', '#020711'] as const,
    topAbyss: 'rgba(0,3,10,0.38)',
    orbit: 'rgba(42,143,255,0.72)',
    orbitGlow: 'rgba(45,146,255,0.9)',
    star: '#2f8fff',
    starOpacity: 0.14,
    card: 'rgba(6,17,34,0.84)',
    control: 'rgba(13,26,48,0.9)',
    input: 'rgba(7,20,40,0.72)',
    selectedSoft: 'rgba(38,111,219,0.18)',
    premiumGradient: ['rgba(251,191,36,0.16)', 'rgba(11,18,30,0.94)', 'rgba(255,183,18,0.08)'] as const,
  };
}

function toMeridiemTime(value: string) {
  const [hourText = '20', minute = '00'] = value.split(':');
  const hour24 = Number.parseInt(hourText, 10) || 0;
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute.padStart(2, '0')} ${meridiem}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#020812',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    paddingTop: 12,
    gap: 10,
  },
  topAbyss: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 260,
    backgroundColor: 'rgba(0,3,10,0.38)',
  },
  planetOuter: {
    position: 'absolute',
    top: -178,
    right: -72,
    width: 392,
    height: 392,
    borderRadius: 196,
    borderWidth: 2,
    borderColor: 'rgba(42,143,255,0.72)',
    shadowColor: '#1a8dff',
    shadowOpacity: 0.65,
    shadowRadius: 30,
    shadowOffset: { width: -10, height: 18 },
  },
  planetGlow: {
    position: 'absolute',
    top: 56,
    right: 54,
    width: 2,
    height: 190,
    backgroundColor: 'rgba(45,146,255,0.9)',
    shadowColor: '#2d92ff',
    shadowOpacity: 1,
    shadowRadius: 18,
    transform: [{ rotate: '-13deg' }],
  },
  stars: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 270,
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2f8fff',
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  searchButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,26,48,0.9)',
    borderWidth: 1.2,
    borderColor: 'rgba(114,137,173,0.36)',
    shadowColor: '#000000',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(6,17,34,0.84)',
    borderWidth: 1.2,
    borderColor: 'rgba(92,118,155,0.36)',
    shadowColor: '#001329',
    shadowOpacity: 0.36,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  compactCard: {
    paddingVertical: 14,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#2f98ff',
    padding: 4,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  profileCopy: {
    flex: 1,
    gap: 5,
  },
  profileEyebrow: {
    color: '#92a2c4',
    fontSize: 12,
    fontWeight: '600',
  },
  nameInput: {
    minHeight: 36,
    borderRadius: 14,
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
    backgroundColor: 'rgba(7,20,40,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(96,125,169,0.32)',
  },
  avatarStrip: {
    gap: 8,
    paddingRight: 10,
  },
  avatarChoice: {
    width: 38,
    height: 38,
    borderRadius: 19,
    padding: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(109,132,170,0.38)',
    backgroundColor: 'rgba(5,15,30,0.8)',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  avatarChoiceImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  headingCopy: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    color: '#c0c9de',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '400',
  },
  themeTray: {
    minHeight: 132,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(82,107,145,0.28)',
    backgroundColor: 'rgba(8,19,36,0.82)',
    flexDirection: 'row',
    paddingHorizontal: 5,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  themeSlot: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  themeDivider: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 1,
    backgroundColor: 'rgba(58,78,110,0.33)',
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'transparent',
    marginHorizontal: 4,
  },
  themeOptionSelected: {
    backgroundColor: 'rgba(38,111,219,0.18)',
    borderColor: '#2f98ff',
    shadowColor: '#2f98ff',
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  themeLabel: {
    color: '#bec8e5',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  themeLabelActive: {
    color: '#3698ff',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(142,157,190,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#3698ff',
    shadowColor: '#3698ff',
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3698ff',
  },
  dottedRing: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dottedRingActive: {
    transform: [{ scale: 1.05 }],
  },
  ringDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  focusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  focusText: {
    color: '#c2cbe0',
    fontSize: 13,
    lineHeight: 17,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  insetRow: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(82,107,145,0.28)',
    backgroundColor: 'rgba(8,19,36,0.72)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  rowValue: {
    color: '#2f95ff',
    fontSize: 14,
    fontWeight: '500',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  metricTile: {
    flex: 1,
    minHeight: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(82,107,145,0.28)',
    backgroundColor: 'rgba(8,19,36,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#c6cee0',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
  },
  metricValue: {
    color: '#23f0a5',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
  },
  metricValueLimited: {
    color: '#24e9df',
  },
  premiumCard: {
    minHeight: 84,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255,183,18,0.68)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    overflow: 'hidden',
    shadowColor: '#ffb712',
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
  },
  goldSparkA: {
    position: 'absolute',
    top: 17,
    right: 135,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffcd34',
  },
  goldSparkB: {
    position: 'absolute',
    bottom: 30,
    right: 102,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffcd34',
  },
  premiumRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activePill: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ffce1f',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,193,31,0.09)',
  },
  activePillText: {
    color: '#ffdf60',
    fontSize: 13,
    fontWeight: '500',
  },
  listRow: {
    minHeight: 42,
    borderTopWidth: 1,
    borderTopColor: 'rgba(105,126,160,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  listLabel: {
    color: '#e7edf9',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '400',
  },
  listLabelDestructive: {
    color: '#ff514f',
    fontWeight: '500',
  },
  accountSection: {
    gap: 12,
  },
  accountSummary: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  accountSummaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  accountIdentity: {
    flex: 1,
    gap: 6,
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '700',
  },
  accountCaption: {
    fontSize: 13,
    lineHeight: 18,
  },
  verificationBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  verificationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accountAction: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  accountActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  accountForm: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  accountFormTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  accountInput: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: 'transparent',
  },
  accountPrimaryButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  accountPrimaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  accountFeedback: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  accountFeedbackText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  utilityRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  utilityButton: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 13,
    justifyContent: 'center',
    backgroundColor: 'rgba(8,19,36,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(92,118,155,0.30)',
  },
  utilityText: {
    color: '#c3cde2',
    fontSize: 14,
    fontWeight: '700',
  },
});
