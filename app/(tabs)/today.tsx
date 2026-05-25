import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getProfileAvatar } from '@/src/constants/profile';
import { EmptyState } from '@/src/components/empty-state';
import { HabitCard } from '@/src/components/habit-card';
import { calculateStreak, getTodayProgress } from '@/src/domain/habits';
import { useAppStore, useTodayHabits } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';

type FilterItem = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const accentPalette = ['#22d3ee', '#34d399', '#60a5fa', '#8b5cf6', '#f59e0b', '#10b981', '#6366f1'];
const emptyRingPalette = ['#7c3aed', '#38bdf8', '#22c55e'];

export default function TodayScreen() {
  const tokens = useThemeTokens();
  const isLight = tokens.mode === 'light';
  const insets = useSafeAreaInsets();
  const todayHabits = useTodayHabits();
  const logs = useAppStore((state) => state.logs);
  const habits = useAppStore((state) => state.habits);
  const seedRandomCompletions = useAppStore((state) => state.seedTodayRandomCompletionTest);
  const archiveHabit = useAppStore((state) => state.archiveHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  const session = useAppStore((state) => state.session);
  const profileAvatarId = useAppStore((state) => state.preferences.profileAvatarId);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const now = new Date();
  const dateKey = format(now, 'yyyy-MM-dd');
  const activeHabits = habits.filter((habit) => !habit.archivedAt);
  const hasArchivedHabits = habits.some((habit) => Boolean(habit.archivedAt));
  const progress = getTodayProgress(activeHabits, logs, dateKey);
  const currentStreak = activeHabits.reduce((best, habit) => Math.max(best, calculateStreak(habit, logs).current), 0);
  const remainingCount = Math.max(progress.scheduledCount - progress.completedCount, 0);
  const profileAvatar = getProfileAvatar(profileAvatarId);
  const firstName = (session.displayName ?? 'Friend').split(' ')[0];
  const greeting = getGreeting(now.getHours());
  const encouragement = getEncouragement(progress.percentage);
  const progressRingColors = getProgressRingColors(todayHabits);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weeklyTrend = Array.from({ length: 7 }, (_, index) => format(addDays(weekStart, index), 'yyyy-MM-dd')).map((dayKey) => {
    const dailyProgress = getTodayProgress(activeHabits, logs, dayKey);
    return {
      key: dayKey,
      label: format(parseISO(dayKey), 'EEEEE'),
      percentage: Math.max(dailyProgress.percentage, dailyProgress.scheduledCount ? 16 : 8),
      isToday: dayKey === dateKey,
    };
  });

  const filters: FilterItem[] = Array.from(new Set(todayHabits.map((habit) => habit.category.trim()).filter(Boolean))).map((category) => ({
      id: category,
      label: category,
      icon: getCategoryIcon(category),
    }));

  const visibleHabits = selectedFilter === 'all' ? todayHabits : todayHabits.filter((habit) => habit.category === selectedFilter);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tokens.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 156 + Math.max(insets.bottom, 12) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.greeting, { color: tokens.text }]}>
              {greeting}, {firstName}! <Text style={styles.wave}>👋</Text>
            </Text>
            <Text style={[styles.dateText, { color: tokens.textMuted }]}>{format(now, 'MMMM d, yyyy')} • {format(now, 'EEEE')}</Text>
          </View>

          <View style={[styles.avatarWrap, { shadowColor: profileAvatar.glow }]}>
            <Image source={{ uri: profileAvatar.imageUri }} style={styles.avatarImage} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              onPress={() => router.push('/settings')}
              style={[styles.avatarBadge, { backgroundColor: profileAvatar.accent, borderColor: tokens.background }]}
            >
              <Ionicons name="sparkles" size={12} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isLight ? '#ffffff' : '#08111f',
              borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.14)',
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.progressRingWrap}>
              <View style={[styles.progressTrack, { borderColor: isLight ? '#d8e4f1' : 'rgba(148,163,184,0.18)' }]}>
                <View style={[styles.progressArcPurple, { borderColor: progressRingColors[0] }]} />
                <View style={[styles.progressArcBlue, { borderColor: progressRingColors[1] }]} />
                <View style={[styles.progressArcGreen, { borderColor: progressRingColors[2], opacity: progress.percentage > 0 ? 1 : 0.45 }]} />
                <View style={[styles.progressCenter, { backgroundColor: isLight ? '#f7fbff' : '#09101b' }]}>
                  <Text style={[styles.progressValue, { color: isLight ? '#10243e' : '#ffffff' }]}>{progress.percentage}%</Text>
                  <Text style={[styles.progressLabel, { color: isLight ? '#5c6b82' : 'rgba(226,232,240,0.82)' }]}>Daily Progress</Text>
                </View>
              </View>
            </View>

            <View style={styles.heroSummary}>
              <Text style={[styles.heroTitle, { color: isLight ? '#0f766e' : '#4ade80' }]}>{encouragement.title}</Text>
              <Text style={[styles.heroBody, { color: isLight ? '#5c6b82' : 'rgba(226,232,240,0.84)' }]}>{encouragement.body}</Text>

              <View style={styles.weekRow}>
                {weeklyTrend.map((day, index) => (
                  <View key={day.key} style={styles.weekDay}>
                    <View style={[styles.weekBarTrack, { backgroundColor: isLight ? '#e7eef7' : 'rgba(148,163,184,0.16)' }]}>
                      <View
                        style={[
                          styles.weekBarFill,
                          {
                            height: `${day.percentage}%`,
                            backgroundColor: accentPalette[index % accentPalette.length],
                            opacity: day.isToday ? 1 : 0.92,
                          },
                        ]}
                      />
                    </View>
                    <View style={[styles.weekLabelChip, day.isToday && { backgroundColor: isLight ? '#2563eb' : '#16a34a' }]}>
                      <Text style={[styles.weekLabel, { color: day.isToday ? '#ffffff' : isLight ? '#6b7a90' : 'rgba(148,163,184,0.9)' }]}>{day.label}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: isLight ? '#ffffff' : '#09111d',
              borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)',
            },
          ]}
        >
          <StatTile icon="flame" tint="#22c55e" value={currentStreak} label="Day Streak" mode={tokens.mode} />
          <View style={[styles.metricDivider, { backgroundColor: isLight ? '#e4ebf4' : 'rgba(148,163,184,0.18)' }]} />
          <StatTile icon="checkmark-circle" tint="#3b82f6" value={progress.completedCount} label="Completed" mode={tokens.mode} />
          <View style={[styles.metricDivider, { backgroundColor: isLight ? '#e4ebf4' : 'rgba(148,163,184,0.18)' }]} />
          <StatTile icon="time" tint="#f59e0b" value={remainingCount} label="Remaining" mode={tokens.mode} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedFilter === 'all' }}
            onPress={() => setSelectedFilter('all')}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === 'all' ? (isLight ? '#e7f0ff' : 'rgba(124,58,237,0.16)') : isLight ? '#ffffff' : '#09111d',
                borderColor: selectedFilter === 'all' ? (isLight ? '#b8cff8' : 'rgba(167,139,250,0.95)') : isLight ? '#d9e6f3' : 'rgba(96,165,250,0.10)',
                shadowColor: selectedFilter === 'all' ? '#8b5cf6' : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: selectedFilter === 'all' ? (isLight ? '#1d4ed8' : '#ffffff') : isLight ? tokens.text : 'rgba(226,232,240,0.9)' },
              ]}
            >
              All
            </Text>
          </Pressable>
          {hasArchivedHabits ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open archived habits"
              onPress={() => router.push('/archive')}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isLight ? '#ffffff' : '#09111d',
                  borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.10)',
                  shadowColor: 'transparent',
                },
              ]}
            >
              <Ionicons name="archive-outline" size={14} color={isLight ? '#64748b' : '#a78bfa'} />
              <Text style={[styles.filterText, { color: isLight ? tokens.text : 'rgba(226,232,240,0.9)' }]}>Archived</Text>
            </Pressable>
          ) : null}
          {filters.map((filter) => {
            const selected = filter.id === selectedFilter;
            return (
              <Pressable
                key={filter.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedFilter(filter.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selected ? (isLight ? '#e7f0ff' : 'rgba(124,58,237,0.16)') : isLight ? '#ffffff' : '#09111d',
                    borderColor: selected ? (isLight ? '#b8cff8' : 'rgba(167,139,250,0.95)') : isLight ? '#d9e6f3' : 'rgba(96,165,250,0.10)',
                    shadowColor: selected ? '#8b5cf6' : 'transparent',
                  },
                ]}
              >
                <Ionicons name={filter.icon} size={14} color={selected ? (isLight ? '#2563eb' : '#4ade80') : isLight ? '#64748b' : '#a78bfa'} />
                <Text style={[styles.filterText, { color: selected ? (isLight ? '#1d4ed8' : '#ffffff') : isLight ? tokens.text : 'rgba(226,232,240,0.9)' }]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>Today's Habits</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Seed five random completed habit logs from the last two weeks"
            onPress={() => {
              const summary = seedRandomCompletions();
              Alert.alert(
                'Test data seeded',
                `Added ${summary.seededCount} completed habits in the last two weeks.\n${summary.currentWeekCount} of them landed in the current analytics week.`,
              );
            }}
            style={[
              styles.testButton,
              {
                backgroundColor: isLight ? '#ffffff' : '#09111d',
                borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)',
              },
            ]}
          >
            <Ionicons name="flash" size={14} color={isLight ? '#2563eb' : '#4ade80'} />
            <Text style={[styles.testButtonText, { color: isLight ? '#1d4ed8' : '#e2e8f0' }]}>Test</Text>
          </Pressable>
        </View>

        {visibleHabits.length ? (
          visibleHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              dateKey={dateKey}
              onOpen={() => router.push(`/habit/${habit.id}`)}
              onEdit={() => router.push(`/habit/edit/${habit.id}`)}
              onArchive={() => archiveHabit(habit.id)}
              onDelete={() => deleteHabit(habit.id)}
            />
          ))
        ) : (
          <EmptyState
            title={todayHabits.length ? 'No habits in this category' : 'Nothing scheduled yet'}
            subtitle={todayHabits.length ? 'Switch filters or add another habit to fill out today.' : 'Create your first habit and it will show up here with live progress.'}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ icon, tint, value, label, mode }: { icon: React.ComponentProps<typeof Ionicons>['name']; tint: string; value: number; label: string; mode: 'light' | 'dark' | 'amoled' }) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statTopRow}>
        <Ionicons name={icon} size={16} color={tint} />
        <Text style={[styles.statValue, { color: mode === 'light' ? '#10243e' : '#ffffff' }]}>{value}</Text>
      </View>
      <Text style={[styles.statLabel, { color: mode === 'light' ? '#5c6b82' : 'rgba(226,232,240,0.78)' }]}>{label}</Text>
    </View>
  );
}

function getGreeting(hour: number) {
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

function getEncouragement(percentage: number) {
  if (percentage >= 80) {
    return { title: 'Great job!', body: "You're building amazing habits." };
  }
  if (percentage >= 40) {
    return { title: 'Nice work!', body: "You're building steady momentum." };
  }
  return { title: 'Let’s begin!', body: 'A few small wins will move today forward.' };
}

function getCategoryIcon(category: string): React.ComponentProps<typeof Ionicons>['name'] {
  const key = category.toLowerCase();
  if (key.includes('health') || key.includes('well')) {
    return 'heart';
  }
  if (key.includes('focus') || key.includes('mind')) {
    return 'sparkles';
  }
  if (key.includes('fit') || key.includes('workout')) {
    return 'barbell';
  }
  if (key.includes('learn') || key.includes('study') || key.includes('read')) {
    return 'book';
  }
  if (key.includes('sleep')) {
    return 'moon';
  }
  return 'sparkles';
}

function getProgressRingColors(habits: { category: string; color: string }[]) {
  const categoryColors = Array.from(
    new Map(
      habits
        .filter((habit) => habit.category.trim() && habit.color)
        .map((habit) => [habit.category.trim().toLowerCase(), habit.color] as const),
    ).values(),
  );

  const sourceColors = categoryColors.length ? categoryColors : emptyRingPalette;
  return Array.from({ length: 3 }, (_, index) => sourceColors[index % sourceColors.length]);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
    paddingTop: 2,
  },
  greeting: {
    fontSize: 29,
    fontWeight: '800',
    lineHeight: 34,
  },
  wave: {
    fontSize: 24,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
  },
  avatarWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 16,
  },
  progressRingWrap: {
    width: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressArcPurple: {
    position: 'absolute',
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 10,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#7c3aed',
    borderLeftColor: '#7c3aed',
    transform: [{ rotate: '-35deg' }],
  },
  progressArcBlue: {
    position: 'absolute',
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 10,
    borderTopColor: '#38bdf8',
    borderRightColor: '#38bdf8',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '12deg' }],
  },
  progressArcGreen: {
    position: 'absolute',
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 10,
    borderTopColor: '#22c55e',
    borderRightColor: '#22c55e',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '-64deg' }],
  },
  progressCenter: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  progressValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  heroSummary: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 160,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    gap: 4,
    paddingTop: 4,
  },
  weekDay: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 6,
  },
  weekBarTrack: {
    width: 6,
    height: 52,
    borderRadius: 999,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weekBarFill: {
    width: '100%',
    borderRadius: 999,
  },
  weekLabelChip: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statTile: {
    flex: 1,
    gap: 6,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 6,
  },
  filterRow: {
    gap: 10,
    paddingVertical: 2,
  },
  filterChip: {
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '800',
  },
  testButton: {
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
