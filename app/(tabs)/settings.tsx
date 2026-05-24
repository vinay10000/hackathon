import type React from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { signOutOfFirebase } from '@/src/lib/auth';
import { canScheduleNotifications, requestNotificationAccess } from '@/src/lib/notifications';
import { buildLocalDataExport, buildPrivacySafeTelemetry } from '@/src/lib/privacy-export';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';
import { ThemePreference } from '@/src/types/habits';

const themeOptions: { label: string; value: ThemePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'AMOLED', value: 'amoled' },
];

export default function SettingsScreen() {
  const tokens = useThemeTokens();
  const preferences = useAppStore((state) => state.preferences);
  const session = useAppStore((state) => state.session);
  const premium = useAppStore((state) => state.premium);
  const habits = useAppStore((state) => state.habits);
  const logs = useAppStore((state) => state.logs);
  const setNotificationPermission = useAppStore((state) => state.setNotificationPermission);
  const setTheme = useAppStore((state) => state.setTheme);
  const setAiEnabled = useAppStore((state) => state.setAiEnabled);
  const setTelemetryEnabled = useAppStore((state) => state.setTelemetryEnabled);
  const setPremiumEntitlement = useAppStore((state) => state.setPremiumEntitlement);
  const continueAsGuest = useAppStore((state) => state.continueAsGuest);
  const markSynced = useAppStore((state) => state.markSynced);
  const resetLocalData = useAppStore((state) => state.resetLocalData);

  return (
    <ScreenShell title="Settings" subtitle="Manage profile, themes, reminders, AI controls, privacy, and premium access from one local-first surface.">
      <SettingsCard title="Theme" tokens={tokens}>
        <View style={styles.segmentRow}>
          {themeOptions.map((option) => {
            const selected = preferences.theme === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setTheme(option.value)}
                style={[styles.segment, { backgroundColor: selected ? tokens.primary : tokens.surfaceMuted, borderColor: tokens.border }]}
              >
                <Text style={[styles.segmentLabel, { color: selected && tokens.mode === 'light' ? '#ffffff' : tokens.text }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.body, { color: tokens.textMuted }]}>AMOLED uses true black (#000000) and applies immediately without restarting.</Text>
      </SettingsCard>

      <SettingsCard title="Profile and sync" tokens={tokens}>
        <Text style={[styles.body, { color: tokens.textMuted }]}>Mode: {session.mode} · Sync: {session.syncStatus}</Text>
        <Text style={[styles.body, { color: tokens.textMuted }]}>{session.email ? `Signed in as ${session.email}` : 'Sign in to upgrade this guest session without losing local habits.'}</Text>
        <View style={styles.row}>
          <PrimaryButton label={session.mode === 'guest' ? 'Sign in' : 'Switch account'} tone="secondary" onPress={() => router.push('/auth')} />
          <PrimaryButton
            label="Sign out to guest"
            tone="secondary"
            onPress={async () => {
              await signOutOfFirebase();
              continueAsGuest();
            }}
          />
          <PrimaryButton label="Mark sync checked" onPress={markSynced} />
        </View>
        <Text style={[styles.body, { color: tokens.textMuted }]}>Email and native Android Google sign-in use Firebase Auth; local habit data stays available while sync is queued.</Text>
      </SettingsCard>

      <SettingsCard title="Reminders" tokens={tokens}>
        <Text style={[styles.body, { color: tokens.textMuted }]}>Current status: {preferences.notificationPermission}</Text>
        <PrimaryButton
          label="Enable reminders"
          onPress={async () => {
            const nextValue = await requestNotificationAccess();
            setNotificationPermission(nextValue);
          }}
        />
        {!canScheduleNotifications() ? <Text style={[styles.warning, { color: tokens.warning }]}>Notifications only schedule on a physical device.</Text> : null}
      </SettingsCard>

      <SettingsCard title="AI controls and privacy" tokens={tokens}>
        <ToggleRow label="AI assistant enabled" value={preferences.aiEnabled} onValueChange={setAiEnabled} tokens={tokens} />
        <ToggleRow label="Privacy-safe telemetry" value={preferences.telemetryEnabled} onValueChange={setTelemetryEnabled} tokens={tokens} />
        <Text style={[styles.body, { color: tokens.textMuted }]}>Telemetry is opt-in and should exclude personal habit names, notes, and command text.</Text>
      </SettingsCard>

      <SettingsCard title="Premium" tokens={tokens}>
        <Text style={[styles.body, { color: tokens.textMuted }]}>Current plan: {premium.entitlement}. Provider seam: {premium.provider}.</Text>
        <View style={styles.row}>
          <PrimaryButton label="Preview premium" onPress={() => setPremiumEntitlement('premium')} />
          <PrimaryButton label="Return to free" tone="secondary" onPress={() => setPremiumEntitlement('free')} />
        </View>
        <Text style={[styles.body, { color: tokens.textMuted }]}>Multiple reminders, streak freeze, export, backup, and premium AI limits can now check this entitlement before executing.</Text>
      </SettingsCard>

      <SettingsCard title="Help, legal, and data" tokens={tokens}>
        <InfoRow label="Help and feedback" value="In-app support surface" tokens={tokens} />
        <InfoRow label="Privacy policy" value="No sale of habit data" tokens={tokens} />
        <InfoRow label="Terms of service" value="Plain-language entry point" tokens={tokens} />
        <Pressable
          style={[styles.linkRow, { borderColor: tokens.border }]}
          onPress={() => {
            const exportData = buildLocalDataExport({ habits, logs, preferences, session, premium });
            Alert.alert('Export prepared', `Local JSON export is ready in memory (${exportData.length} characters). A native file/share target can plug into this seam.`);
          }}
        >
          <Text style={[styles.linkLabel, { color: tokens.text }]}>Export data</Text>
          <Text style={[styles.body, { color: tokens.textMuted }]}>{premium.entitlement === 'premium' ? 'Available' : 'Premium preview'}</Text>
        </Pressable>
        <Pressable
          style={[styles.linkRow, { borderColor: tokens.border }]}
          onPress={() => {
            buildPrivacySafeTelemetry('local_data_reset_requested', { habitCount: habits.length, logCount: logs.length });
            Alert.alert('Delete local data?', 'This clears local habits, logs, and assistant history on this device.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: resetLocalData },
            ]);
          }}
        >
          <Text style={[styles.linkLabel, { color: tokens.danger }]}>Delete account and local data</Text>
          <Text style={[styles.body, { color: tokens.textMuted }]}>Confirm required</Text>
        </Pressable>
      </SettingsCard>
    </ScreenShell>
  );
}

function InfoRow({ label, value, tokens }: { label: string; value: string; tokens: ReturnType<typeof useThemeTokens> }) {
  return (
    <View style={[styles.linkRow, { borderColor: tokens.border }]}>
      <Text style={[styles.linkLabel, { color: tokens.text }]}>{label}</Text>
      <Text style={[styles.body, { color: tokens.textMuted }]}>{value}</Text>
    </View>
  );
}

function SettingsCard({ title, tokens, children }: { title: string; tokens: ReturnType<typeof useThemeTokens>; children: React.ReactNode }) {
  return (
    <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <Text style={[styles.title, { color: tokens.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function ToggleRow({ label, value, onValueChange, tokens }: { label: string; value: boolean; onValueChange: (value: boolean) => void; tokens: ReturnType<typeof useThemeTokens> }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={[styles.linkLabel, { color: tokens.text }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: tokens.surfaceMuted, true: tokens.primarySoft }} thumbColor={value ? tokens.primary : tokens.textMuted} />
    </View>
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
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  segmentLabel: {
    fontWeight: '800',
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
  warning: {
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  linkRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkLabel: {
    fontWeight: '800',
  },
});
