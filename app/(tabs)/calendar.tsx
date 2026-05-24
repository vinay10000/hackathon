import { router } from 'expo-router';
import { addMonths, format, isSameMonth, subMonths } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/src/components/empty-state';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { buildMonthGrid, getLogStatusForHabitOnDate } from '@/src/domain/habits';
import { useAppStore } from '@/src/store/app-store';
import { palette } from '@/src/theme/colors';

const statusColors = {
  completed: palette.success,
  partial: palette.warning,
  skipped: palette.textMuted,
  missed: palette.danger,
  pending: palette.border,
};

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const habits = useAppStore((state) => state.habits.filter((habit) => !habit.archivedAt));
  const logs = useAppStore((state) => state.logs);
  const days = buildMonthGrid(currentMonth);
  const habitsForDate = habits.filter((habit) => getLogStatusForHabitOnDate(habit, logs, selectedDate) !== 'pending');

  return (
    <ScreenShell title="Calendar" subtitle="Inspect streaks, misses, and partial progress by date without leaving the app's local-first core." action={<PrimaryButton label="Archive" tone="secondary" onPress={() => router.push('/archive')} />}>
      <View style={styles.monthHeader}>
        <PrimaryButton label="Prev" tone="secondary" onPress={() => setCurrentMonth((value) => subMonths(value, 1))} />
        <Text style={styles.monthLabel}>{format(currentMonth, 'MMMM yyyy')}</Text>
        <PrimaryButton label="Next" tone="secondary" onPress={() => setCurrentMonth((value) => addMonths(value, 1))} />
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const selected = selectedDate === dateKey;
          const completedCount = habits.filter((habit) => getLogStatusForHabitOnDate(habit, logs, dateKey) === 'completed').length;
          const partialCount = habits.filter((habit) => getLogStatusForHabitOnDate(habit, logs, dateKey) === 'partial').length;
          const color = completedCount ? statusColors.completed : partialCount ? statusColors.partial : statusColors.pending;

          return (
            <Pressable key={dateKey} style={[styles.dayCell, !isSameMonth(day, currentMonth) && styles.dayMuted, selected && styles.daySelected]} onPress={() => setSelectedDate(dateKey)}>
              <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>{format(day, 'd')}</Text>
              <View style={[styles.dot, { backgroundColor: color }]} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Selected date: {selectedDate}</Text>
        {habitsForDate.length ? (
          habitsForDate.map((habit) => {
            const status = getLogStatusForHabitOnDate(habit, logs, selectedDate);
            return (
              <Pressable key={habit.id} style={styles.historyCard} onPress={() => router.push(`/habit/${habit.id}`)}>
                <Text style={styles.historyTitle}>{habit.name}</Text>
                <Text style={styles.historyMeta}>{status}</Text>
              </Pressable>
            );
          })
        ) : (
          <EmptyState title="No logged activity" subtitle="This date has no completed, partial, missed, or skipped habit activity yet." />
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCell: {
    width: '13%',
    minWidth: 42,
    aspectRatio: 1,
    backgroundColor: palette.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayMuted: {
    opacity: 0.4,
  },
  daySelected: {
    backgroundColor: '#10243e',
  },
  dayLabel: {
    fontWeight: '700',
    color: palette.text,
  },
  dayLabelSelected: {
    color: '#ffffff',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.text,
  },
  historyCard: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  historyMeta: {
    color: palette.textMuted,
    textTransform: 'capitalize',
  },
});
