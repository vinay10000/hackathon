import { format } from 'date-fns';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/empty-state';
import { ScreenShell } from '@/src/components/screen-shell';
import { StatCard } from '@/src/components/stat-card';
import { calculateCompletionRate, calculateStreak, getRecentDates, getTodayProgress } from '@/src/domain/habits';
import { useAppStore } from '@/src/store/app-store';
import { palette } from '@/src/theme/colors';

export default function AnalyticsScreen() {
  const habits = useAppStore((state) => state.habits.filter((habit) => !habit.archivedAt));
  const logs = useAppStore((state) => state.logs);
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const progress = getTodayProgress(habits, logs, todayKey);
  const totalCompletions = logs.filter((log) => log.status === 'completed').length;
  const bestHabit = habits
    .map((habit) => ({ habit, rate: calculateCompletionRate(habit, logs), streak: calculateStreak(habit, logs).current }))
    .sort((left, right) => right.rate - left.rate)[0];
  const mostMissedHabit = habits
    .map((habit) => ({
      habit,
      misses: getRecentDates(30).filter((dateKey) => {
        const isScheduled = getTodayProgress([habit], logs, dateKey).scheduledCount > 0;
        const hasCompletion = logs.some((log) => log.habitId === habit.id && log.date === dateKey && log.status === 'completed');
        return isScheduled && !hasCompletion && dateKey < todayKey;
      }).length,
    }))
    .sort((left, right) => right.misses - left.misses)[0];

  return (
    <ScreenShell title="Analytics" subtitle="Track completion percentage, streak strength, and which habits need attention next.">
      <View style={styles.stats}>
        <StatCard label="Today completion" value={`${progress.percentage}%`} accent={palette.primary} />
        <StatCard label="Total completions" value={String(totalCompletions)} accent={palette.success} />
        <StatCard label="Active habits" value={String(habits.length)} accent={palette.purple} />
      </View>

      {bestHabit ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Best-performing habit</Text>
          <Text style={styles.cardValue}>{bestHabit.habit.name}</Text>
          <Text style={styles.cardMeta}>
            {bestHabit.rate}% completion rate · {bestHabit.streak} day current streak
          </Text>
        </View>
      ) : (
        <EmptyState title="Analytics will build itself" subtitle="Log a few habits and this screen will start summarizing streaks, completion rate, and misses." />
      )}

      {mostMissedHabit ? (
        <View style={styles.cardAlt}>
          <Text style={styles.cardTitle}>Most missed in the last 30 days</Text>
          <Text style={styles.cardValue}>{mostMissedHabit.habit.name}</Text>
          <Text style={styles.cardMeta}>{mostMissedHabit.misses} missed scheduled days</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {habits.map((habit) => {
          const streak = calculateStreak(habit, logs);
          const rate = calculateCompletionRate(habit, logs);
          return (
            <View key={habit.id} style={styles.listItem}>
              <View>
                <Text style={styles.listTitle}>{habit.name}</Text>
                <Text style={styles.listMeta}>{habit.category}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.listValue}>{rate}%</Text>
                <Text style={styles.listMeta}>{streak.current} day streak</Text>
              </View>
            </View>
          );
        })}
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
  card: {
    backgroundColor: '#10243e',
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  cardAlt: {
    backgroundColor: '#fff7ed',
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.textMuted,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.text,
  },
  cardMeta: {
    color: palette.textMuted,
    lineHeight: 20,
  },
  list: {
    gap: 10,
  },
  listItem: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontWeight: '700',
    color: palette.text,
  },
  listValue: {
    fontWeight: '800',
    color: palette.text,
  },
  listMeta: {
    color: palette.textMuted,
  },
});
