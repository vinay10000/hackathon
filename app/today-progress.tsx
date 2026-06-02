import { Ionicons } from '@expo/vector-icons';
import { addDays, eachWeekOfInterval, format, isSameDay, startOfWeek, subDays } from 'date-fns';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getHabitLogForDate, getTodayProgress } from '@/src/domain/habits';
import { useAppStore, useTodayHabits } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';
import { Habit, HabitLog } from '@/src/types/habits';

export default function TodayProgressScreen() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const todayHabits = useTodayHabits();
  const logs = useAppStore((state) => state.logs);
  const archiveHabit = useAppStore((state) => state.archiveHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const progress = getTodayProgress(todayHabits, logs, todayKey);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const dayStrip = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index);
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayProgress = getTodayProgress(todayHabits, logs, dayKey);
    return {
      key: dayKey,
      date: day,
      completed: dayProgress.completedCount,
      scheduled: dayProgress.scheduledCount,
      isToday: isSameDay(day, today),
    };
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tokens.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 + Math.max(insets.bottom, 16) }]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.headerTitle, { color: tokens.text }]}>{format(today, "EEEE, do MMMM")}</Text>
            <Text style={[styles.headerSubtitle, { color: tokens.textMuted }]}>Live progress from your real habits and logs.</Text>
          </View>
        </View>

        <View style={[styles.weekStripCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <View style={styles.weekStrip}>
            {dayStrip.map((day) => (
              <View key={day.key} style={styles.weekDay}>
                <Text style={[styles.weekDayLabel, { color: day.isToday ? tokens.success : tokens.textMuted }]}>{format(day.date, 'EEE')}</Text>
                <View
                  style={[
                    styles.weekDayBox,
                    {
                      backgroundColor: day.isToday ? `${tokens.success}18` : tokens.surfaceMuted,
                      borderColor: day.isToday ? tokens.success : tokens.border,
                    },
                  ]}
                >
                  <Text style={[styles.weekDayNumber, { color: day.isToday ? tokens.success : tokens.textMuted }]}>{format(day.date, 'd')}</Text>
                  <Text style={[styles.weekDayRatio, { color: day.isToday ? tokens.text : tokens.textMuted }]}>
                    {day.scheduled ? `${day.completed}/${day.scheduled}` : '--'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[styles.summaryTitle, { color: tokens.text }]}>Today</Text>
          <Text style={[styles.summaryValue, { color: tokens.success }]}>{progress.scheduledCount ? `${progress.completedCount}/${progress.scheduledCount}` : '0/0'}</Text>
          <Text style={[styles.summaryText, { color: tokens.textMuted }]}>Tap the check button to complete or undo today’s habit.</Text>
        </View>

        <View style={styles.cardList}>
          {todayHabits.map((habit) => (
            <ProgressHabitCard
              key={habit.id}
              habit={habit}
              dateKey={todayKey}
              logs={logs}
              onOpen={() => router.push(`/habit/${habit.id}`)}
              onEdit={() => router.push(`/habit/edit/${habit.id}`)}
              onArchive={() => archiveHabit(habit.id)}
              onDelete={() => deleteHabit(habit.id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressHabitCard({
  habit,
  dateKey,
  logs,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
}: {
  habit: Habit;
  dateKey: string;
  logs: HabitLog[];
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => Promise<void>;
}) {
  const tokens = useThemeTokens();
  const toggleHabitComplete = useAppStore((state) => state.toggleHabitComplete);
  const todayLog = getHabitLogForDate(logs, habit.id, dateKey);
  const heatmap = buildHabitHeatmap(habit, logs);

  return (
    <HabitProgressCardInner
      habit={habit}
      onOpen={onOpen}
      onEdit={onEdit}
      onArchive={onArchive}
      onDelete={onDelete}
      onToggleToday={() => toggleHabitComplete(habit.id, dateKey)}
      completedToday={todayLog?.status === 'completed'}
      heatmap={heatmap}
      tokens={tokens}
    />
  );
}

function HabitProgressCardInner({
  habit,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
  onToggleToday,
  completedToday,
  heatmap,
  tokens,
}: {
  habit: Habit;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => Promise<void>;
  onToggleToday: () => void;
  completedToday: boolean;
  heatmap: ReturnType<typeof buildHabitHeatmap>;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const heatmapScrollRef = useRef<ScrollView | null>(null);
  return (
    <Pressable style={[styles.habitCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]} onPress={onOpen}>
      <View style={styles.habitHeaderRow}>
        <View style={styles.habitIdentity}>
          <View style={[styles.habitIconWrap, { backgroundColor: `${habit.color}22` }]}>
            <Ionicons name={habit.icon as React.ComponentProps<typeof Ionicons>['name']} size={28} color={habit.color} />
          </View>
          <View style={styles.habitTitleCopy}>
            <Text style={[styles.habitTitle, { color: tokens.text }]}>{habit.name}</Text>
            <Text style={[styles.habitSubtitle, { color: tokens.textMuted }]}>Streak: {heatmap.currentStreak}</Text>
          </View>
        </View>

        <View style={styles.habitActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={completedToday ? `Undo ${habit.name}` : `Complete ${habit.name}`}
            style={[
              styles.todayCheckButton,
              {
                backgroundColor: completedToday ? tokens.success : `${tokens.success}20`,
                borderColor: `${tokens.success}55`,
              },
            ]}
            onPress={(event) => {
              event.stopPropagation();
              setMenuOpen(false);
              onToggleToday();
            }}
          >
            <Ionicons name="checkmark" size={24} color={completedToday ? '#ffffff' : tokens.success} />
          </Pressable>

          <View style={styles.progressMenuWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open actions for ${habit.name}`}
              style={styles.progressMenuButton}
              onPress={(event) => {
                event.stopPropagation();
                setMenuOpen((value) => !value);
              }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={tokens.textMuted} />
            </Pressable>

            {menuOpen ? (
              <View style={[styles.progressPopup, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                <PopupAction label="Edit" icon="create-outline" tint={tokens.primary} onPress={() => { setMenuOpen(false); onEdit(); }} />
                <PopupAction label="Archive" icon="archive-outline" tint={tokens.warning} onPress={() => { setMenuOpen(false); onArchive(); }} />
                <PopupAction
                  label="Delete"
                  icon="trash-outline"
                  tint={tokens.danger}
                  onPress={() => {
                    setMenuOpen(false);
                    void onDelete();
                  }}
                />
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.heatmapWrap}>
        <View style={styles.weekdayRail}>
          {['M', 'W', 'F', 'S'].map((label) => (
            <Text key={label} style={[styles.weekdayRailLabel, { color: tokens.textMuted }]}>
              {label}
            </Text>
          ))}
        </View>
        <ScrollView
          ref={heatmapScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.heatmapScrollContent}
          onContentSizeChange={() => heatmapScrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View style={styles.heatmapScrollableContent}>
            <View style={styles.heatmapHeader}>
              {heatmap.monthLabels.map((label) => (
                <Text
                  key={label.key}
                  style={[
                    styles.monthLabel,
                    {
                      color: tokens.textMuted,
                      left: label.offset,
                    },
                  ]}
                >
                  {label.text}
                </Text>
              ))}
            </View>

            <View style={styles.heatmapGrid}>
              {heatmap.weeks.map((week) => (
                <View key={week.key} style={styles.heatmapColumn}>
                  {week.days.map((day) => (
                    <View
                      key={day.key}
                      style={[
                        styles.heatmapCell,
                        {
                          backgroundColor: day.tone,
                          borderColor: day.isToday ? '#ffffff' : 'transparent',
                        },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </Pressable>
  );
}

function PopupAction({
  label,
  icon,
  tint,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.popupAction}>
      <Ionicons name={icon} size={14} color={tint} />
      <Text style={[styles.popupLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

function buildHabitHeatmap(habit: Habit, logs: HabitLog[]) {
  const today = new Date();
  const start = subDays(today, 139);
  const heatmapColumnStride = 20;
  const weeks = eachWeekOfInterval({ start, end: today }, { weekStartsOn: 1 }).map((weekStart) => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      const key = format(date, 'yyyy-MM-dd');
      const status = getHabitLogForDate(logs, habit.id, key)?.status;
      return {
        key,
        isToday: isSameDay(date, today),
        tone:
          status === 'completed'
            ? habit.color
            : status === 'partial'
              ? `${habit.color}88`
              : status === 'skipped'
                ? 'rgba(245,158,11,0.32)'
                : status === 'missed'
                  ? 'rgba(239,68,68,0.22)'
                  : 'rgba(148,163,184,0.12)',
      };
    });

    return {
      key: format(weekStart, 'yyyy-MM-dd'),
      start: weekStart,
      days,
    };
  });

  const monthLabels = weeks
    .filter((week, index) => index === 0 || format(week.start, 'MMM') !== format(weeks[index - 1].start, 'MMM'))
    .map((week) => ({
      key: week.key,
      text: format(week.start, "MMM ''yy"),
      offset: weeks.findIndex((candidate) => candidate.key === week.key) * heatmapColumnStride,
    }));

  let currentStreak = 0;
  for (let index = weeks.length - 1; index >= 0; index -= 1) {
    for (let dayIndex = weeks[index].days.length - 1; dayIndex >= 0; dayIndex -= 1) {
      const day = weeks[index].days[dayIndex];
      const status = getHabitLogForDate(logs, habit.id, day.key)?.status;
      if (status === 'completed' || status === 'partial') {
        currentStreak += 1;
      } else if (day.key <= format(today, 'yyyy-MM-dd')) {
        return { weeks, monthLabels, currentStreak };
      }
    }
  }

  return { weeks, monthLabels, currentStreak };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  headerSubtitle: { fontSize: 14, lineHeight: 20 },
  weekStripCard: { borderRadius: 28, borderWidth: 1, padding: 16 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  weekDay: { flex: 1, gap: 8, alignItems: 'center' },
  weekDayLabel: { fontSize: 13, fontWeight: '700' },
  weekDayBox: {
    width: '100%',
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  weekDayNumber: { fontSize: 18, fontWeight: '700' },
  weekDayRatio: { fontSize: 16, fontWeight: '800' },
  summaryCard: { borderRadius: 24, borderWidth: 1, padding: 18, gap: 6 },
  summaryTitle: { fontSize: 18, fontWeight: '700' },
  summaryValue: { fontSize: 36, fontWeight: '800' },
  summaryText: { fontSize: 14, lineHeight: 20 },
  cardList: { gap: 16 },
  habitCard: { borderRadius: 28, borderWidth: 1, padding: 16, gap: 12 },
  habitHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  habitIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitIconWrap: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  habitTitleCopy: { flex: 1, gap: 4 },
  habitTitle: { fontSize: 18, fontWeight: '800' },
  habitSubtitle: { fontSize: 14, fontWeight: '600' },
  habitActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayCheckButton: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressMenuWrap: { position: 'relative' },
  progressMenuButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  progressPopup: {
    position: 'absolute',
    top: 0,
    right: 28,
    width: 108,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    zIndex: 40,
    elevation: 12,
  },
  popupAction: { minHeight: 34, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  popupLabel: { fontSize: 13, fontWeight: '700' },
  heatmapScrollContent: {
    paddingRight: 6,
  },
  heatmapScrollableContent: {
    gap: 10,
  },
  heatmapHeader: {
    position: 'relative',
    minWidth: '100%',
    height: 16,
  },
  monthLabel: {
    position: 'absolute',
    top: 0,
    fontSize: 11,
    fontWeight: '600',
  },
  heatmapWrap: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  weekdayRail: { paddingTop: 2, gap: 18 },
  weekdayRailLabel: { fontSize: 12, fontWeight: '600' },
  heatmapGrid: { flex: 1, flexDirection: 'row', gap: 4 },
  heatmapColumn: { gap: 4 },
  heatmapCell: { width: 16, height: 16, borderRadius: 4, borderWidth: 1 },
});
