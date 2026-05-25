import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/empty-state';
import { HabitCard } from '@/src/components/habit-card';
import { ScreenShell } from '@/src/components/screen-shell';
import { StatCard } from '@/src/components/stat-card';
import { getTodayProgress } from '@/src/domain/habits';
import { useAppStore, useTodayHabits } from '@/src/store/app-store';
import { palette, useThemeTokens } from '@/src/theme/colors';

export default function TodayScreen() {
  const tokens = useThemeTokens();
  const todayHabits = useTodayHabits();
  const logs = useAppStore((state) => state.logs);
  const habits = useAppStore((state) => state.habits);
  const progress = getTodayProgress(habits.filter((habit) => !habit.archivedAt), logs, format(new Date(), 'yyyy-MM-dd'));
  const dateKey = format(new Date(), 'yyyy-MM-dd');

  return (
    <ScreenShell
      title="Today"
      subtitle="One-tap progress, measurable updates, quick notes, and a clean read on what still matters today."
      action={
        <Pressable
          accessibilityLabel="Open settings"
          style={[styles.headerIconButton, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border }]}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Ionicons name="settings-outline" size={22} color={tokens.text} />
        </Pressable>
      }
    >
      <View style={styles.stats}>
        <StatCard label="Completed" value={String(progress.completedCount)} accent={palette.success} />
        <StatCard label="Scheduled" value={String(progress.scheduledCount)} accent={palette.primary} />
        <StatCard label="Progress" value={`${progress.percentage}%`} accent={palette.warning} />
      </View>

      {todayHabits.length ? (
        todayHabits.map((habit) => <HabitCard key={habit.id} habit={habit} dateKey={dateKey} onOpen={() => router.push(`/habit/${habit.id}`)} />)
      ) : (
        <EmptyState title="Nothing scheduled yet" subtitle="Create your first habit and it will land here with today-aware logging, progress, and notes." />
      )}

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Why this milestone matters</Text>
        <Text style={styles.footerBody}>This screen is the core manual loop from the specs: dashboard visibility, instant logging, and edit-safe data that later powers calendar, reminders, and analytics.</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  footerCard: {
    backgroundColor: '#10243e',
    padding: 20,
    borderRadius: 24,
    gap: 8,
  },
  headerIconButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  footerBody: {
    color: '#dbeafe',
    lineHeight: 21,
  },
});
