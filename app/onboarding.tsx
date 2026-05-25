import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { PROFILE_AVATARS } from '@/src/constants/profile';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

const foundations = [
  { value: 'Local', label: 'Works without an account' },
  { value: 'Fast', label: 'Daily check-ins stay under 5 seconds' },
  { value: 'Safe', label: 'AI asks before changing data' },
];

const highlights = ['Offline-first habit logs', 'Light, Dark, and AMOLED themes', 'Voice-ready habit creation'];

export default function OnboardingScreen() {
  const tokens = useThemeTokens();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const setProfile = useAppStore((state) => state.setProfile);
  const savedAvatarId = useAppStore((state) => state.preferences.profileAvatarId);
  const savedName = useAppStore((state) => state.session.displayName ?? '');
  const [name, setName] = useState(savedName === 'Friend' ? '' : savedName);
  const [avatarId, setAvatarId] = useState(savedAvatarId);

  function finishOnboarding(nextRoute: '/(tabs)/today' | '/auth') {
    setProfile({ displayName: name || 'Friend', profileAvatarId: avatarId });
    completeOnboarding();
    router.replace(nextRoute);
  }

  return (
    <ScreenShell title="HabitAI" subtitle="Build a habit loop that stays calm, quick, and private from the first tap." scroll={false}>
      <View style={[styles.hero, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={styles.heroTop}>
          <Text style={[styles.eyebrow, { backgroundColor: tokens.primarySoft, color: tokens.primary }]}>Local-first</Text>
          <Text style={[styles.eyebrow, { backgroundColor: tokens.surfaceMuted, color: tokens.textMuted }]}>AMOLED ready</Text>
        </View>
        <Text style={[styles.heroTitle, { color: tokens.text }]}>Track today. Keep the whole history.</Text>
        <Text style={[styles.heroBody, { color: tokens.textMuted }]}>Start as a guest, add habits in under a minute, and sign in only when you want account sync.</Text>
        <View style={styles.profileBlock}>
          <Text style={[styles.sectionLabel, { color: tokens.text }]}>What should we call you?</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={tokens.textMuted}
            style={[styles.input, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border, color: tokens.text }]}
          />
          <Text style={[styles.sectionLabel, { color: tokens.text }]}>Pick a profile look</Text>
          <View style={styles.avatarRow}>
            {PROFILE_AVATARS.map((avatar) => {
              const selected = avatar.id === avatarId;
              return (
                <Pressable
                  key={avatar.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setAvatarId(avatar.id)}
                  style={[
                    styles.avatarChip,
                    {
                      backgroundColor: avatar.color,
                      borderColor: selected ? '#ffffff' : 'rgba(255,255,255,0.08)',
                    },
                  ]}
                >
                  <Ionicons name={avatar.icon} size={18} color="#ffffff" />
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.metrics}>
          {foundations.map((item) => (
            <View key={item.value} style={[styles.metric, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border }]}>
              <Text style={[styles.metricValue, { color: tokens.text }]}>{item.value}</Text>
              <Text style={[styles.metricLabel, { color: tokens.textMuted }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.panel, { backgroundColor: tokens.mode === 'light' ? '#10243e' : tokens.surface, borderColor: tokens.border }]}>
        <Text style={[styles.panelTitle, { color: tokens.mode === 'light' ? '#ffffff' : tokens.text }]}>Designed around the requirements that matter</Text>
        {highlights.map((item) => (
          <View key={item} style={styles.highlightRow}>
            <View style={[styles.checkDot, { backgroundColor: tokens.success }]} />
            <Text style={[styles.highlightText, { color: tokens.mode === 'light' ? '#dbeafe' : tokens.textMuted }]}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Sign in or create account" onPress={() => finishOnboarding('/auth')} />
        <PrimaryButton label="Continue as guest" tone="secondary" onPress={() => finishOnboarding('/(tabs)/today')} />
        <Pressable onPress={() => finishOnboarding('/(tabs)/today')} style={styles.textButton}>
          <Text style={[styles.textButtonLabel, { color: tokens.textMuted }]}>No account required for local tracking</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    gap: 14,
  },
  heroTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  profileBlock: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  avatarChip: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metrics: {
    flexDirection: 'row',
    gap: 8,
  },
  metric: {
    flex: 1,
    minHeight: 86,
    borderWidth: 1,
    borderRadius: 18,
    justifyContent: 'space-between',
    padding: 12,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  highlightText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  actions: {
    gap: 12,
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  textButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
