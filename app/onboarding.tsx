import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { useAppStore } from '@/src/store/app-store';
import { palette } from '@/src/theme/colors';

const bullets = ['Track habits offline from day one', 'Build streaks, history, and weekly insight', 'Sign in with email or native Google when you want sync'];

export default function OnboardingScreen() {
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);

  return (
    <ScreenShell title="HabitAI" subtitle="A compact, local-first habit system with clean daily tracking and room to grow into AI, sync, and premium later." scroll={false}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Android-first build</Text>
        <Text style={styles.heroTitle}>Start simple. Keep the structure solid.</Text>
        <Text style={styles.heroBody}>This first milestone gives you onboarding, manual tracking, history, analytics, and reminders without forcing sign-in.</Text>
      </View>

      <View style={styles.card}>
        {bullets.map((bullet) => (
          <Text key={bullet} style={styles.bullet}>
            • {bullet}
          </Text>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Sign in or create account"
          onPress={() => router.push('/auth')}
        />
        <PrimaryButton
          label="Continue as guest"
          tone="secondary"
          onPress={() => {
            completeOnboarding();
            router.replace('/(tabs)/today');
          }}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: palette.surface,
    borderRadius: 28,
    padding: 22,
    gap: 10,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primarySoft,
    color: palette.primary,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: palette.text,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.textMuted,
  },
  card: {
    backgroundColor: '#10243e',
    borderRadius: 28,
    padding: 22,
    gap: 12,
  },
  bullet: {
    color: '#eff6ff',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
});
