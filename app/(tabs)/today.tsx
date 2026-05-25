import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getProfileAvatar } from '@/src/constants/profile';
import { EmptyState } from '@/src/components/empty-state';
import { HabitCard } from '@/src/components/habit-card';
import { ScreenShell } from '@/src/components/screen-shell';
import { calculateCompletionRate, calculateStreak, getTodayProgress } from '@/src/domain/habits';
import { useAppStore, useTodayHabits } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

export default function TodayScreen() {
  const tokens = useThemeTokens();
  const todayHabits = useTodayHabits();
  const logs = useAppStore((state) => state.logs);
  const habits = useAppStore((state) => state.habits);
  const session = useAppStore((state) => state.session);
  const profileAvatarId = useAppStore((state) => state.preferences.profileAvatarId);
  const dateKey = format(new Date(), 'yyyy-MM-dd');
  const activeHabits = habits.filter((habit) => !habit.archivedAt);
  const progress = getTodayProgress(activeHabits, logs, dateKey);
  const bestStreak = activeHabits.reduce((best, habit) => Math.max(best, calculateStreak(habit, logs).current), 0);
  const weeklyAverage = activeHabits.length
    ? Math.round(activeHabits.reduce((sum, habit) => sum + calculateCompletionRate(habit, logs), 0) / activeHabits.length)
    : 0;
  const profileAvatar = getProfileAvatar(profileAvatarId);
  const firstName = (session.displayName ?? 'Friend').split(' ')[0];
  const greeting = progress.completedCount >= Math.max(1, progress.scheduledCount - 1) ? 'Good going' : 'Good morning';

  return (
    <ScreenShell
      title=""
      subtitle=""
      action={
        <Pressable
          accessibilityLabel="Open settings"
          style={[styles.headerIconButton, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border }]}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Ionicons name="notifications-outline" size={22} color={tokens.text} />
        </Pressable>
      }
    >
      <View style={styles.heroHeader}>
        <View style={[styles.avatarBadge, { backgroundColor: profileAvatar.color, shadowColor: profileAvatar.glow }]}>
          <Ionicons name={profileAvatar.icon} size={28} color="#ffffff" />
        </View>
        <View style={styles.heroText}>
          <Text style={[styles.greeting, { color: tokens.text }]}>{greeting}, {firstName}</Text>
          <Text style={[styles.greetingSub, { color: tokens.textMuted }]}>Let's build better habits today.</Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <View style={[styles.dateChip, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={[styles.dateIconBox, { backgroundColor: tokens.surfaceMuted }]}>
            <Ionicons name="calendar-outline" size={19} color={tokens.text} />
          </View>
          <Text style={[styles.dateLabel, { color: tokens.text }]}>{format(new Date(), 'EEEE, d MMM')}</Text>
        </View>
        <View style={[styles.todayPill, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[styles.todayPillText, { color: tokens.primary }]}>Today</Text>
          <Ionicons name="chevron-down" size={16} color={tokens.primary} />
        </View>
      </View>

      <View style={[styles.progressCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={styles.progressCopy}>
          <Text style={[styles.progressTitle, { color: tokens.text }]}>Today's Progress</Text>
          <Text style={[styles.progressBody, { color: tokens.textMuted }]}>Keep going, you're doing great!</Text>

          <View style={styles.metricRow}>
            <View style={styles.metricBadge}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(22,163,74,0.18)' }]}>
                <Ionicons name="flame" size={18} color={tokens.success} />
              </View>
              <View>
                <Text style={[styles.metricValue, { color: tokens.text }]}>{bestStreak || progress.completedCount}</Text>
                <Text style={[styles.metricLabel, { color: tokens.success }]}>Day Streak</Text>
              </View>
            </View>

            <View style={styles.metricBadge}>
              <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(124,58,237,0.18)' }]}>
                <Ionicons name="star" size={18} color={tokens.purple} />
              </View>
              <View>
                <Text style={[styles.metricValue, { color: tokens.text }]}>{weeklyAverage}%</Text>
                <Text style={[styles.metricLabel, { color: tokens.textMuted }]}>Weekly Avg</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.ringWrap}>
          <View style={[styles.ringOuter, { borderColor: `${tokens.success}33` }]}>
            <View style={[styles.ringProgress, { borderColor: tokens.success }]} />
            <View style={[styles.ringInner, { backgroundColor: tokens.surface }]}>
              <Text style={[styles.ringValue, { color: tokens.text }]}>
                {progress.completedCount}/{Math.max(progress.scheduledCount, 1)}
              </Text>
              <Text style={[styles.ringLabel, { color: tokens.textMuted }]}>Completed</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.text }]}>Today's Habits</Text>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={15} color={tokens.warning} />
          <Text style={[styles.streakText, { color: tokens.warning }]}>{bestStreak || 0} day streak</Text>
        </View>
      </View>

      {todayHabits.length ? (
        todayHabits.map((habit) => <HabitCard key={habit.id} habit={habit} dateKey={dateKey} onOpen={() => router.push(`/habit/${habit.id}`)} />)
      ) : (
        <EmptyState title="Nothing scheduled yet" subtitle="Create your first habit and it will land here with today-aware logging, progress, and notes." />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarBadge: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
  },
  greetingSub: {
    fontSize: 16,
    lineHeight: 22,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateChip: {
    flex: 1,
    minHeight: 60,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  todayPill: {
    minHeight: 54,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayPillText: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    gap: 12,
  },
  progressCopy: {
    flex: 1,
    gap: 16,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  progressBody: {
    fontSize: 16,
    lineHeight: 22,
  },
  metricRow: {
    gap: 14,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  ringWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringOuter: {
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringProgress: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 14,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '36deg' }],
  },
  ringInner: {
    width: 114,
    height: 114,
    borderRadius: 57,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ringValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  ringLabel: {
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerIconButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
