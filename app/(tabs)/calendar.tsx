import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { ScreenShell } from '@/src/components/screen-shell';
import { getLogStatusForHabitOnDate } from '@/src/domain/habits';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';
import { HabitLogStatus } from '@/src/types/habits';

const weekdayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const statusPriority: HabitLogStatus[] = ['completed', 'partial', 'missed', 'skipped', 'pending'];

export default function CalendarScreen() {
  const tokens = useThemeTokens();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const habits = useAppStore(useShallow((state) => state.habits.filter((habit) => !habit.archivedAt)));
  const logs = useAppStore((state) => state.logs);
  const days = buildCalendarGrid(currentMonth);
  const selectedDateValue = parseISO(selectedDate);
  const selectedDateLabel = format(selectedDateValue, 'MMMM d, yyyy');
  const selectedDayStatuses = habits.map((habit) => ({
    habit,
    status: getLogStatusForHabitOnDate(habit, logs, selectedDate),
  }));
  const habitsForDate = selectedDayStatuses.filter((item) => item.status !== 'pending');

  return (
    <ScreenShell
      title="Calendar"
      subtitle="Track your habits by day and stay consistent."
      action={
        <Pressable
          accessibilityLabel="Open archive"
          style={[
            styles.archiveButton,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
            },
          ]}
          onPress={() => router.push('/archive')}
        >
          <Ionicons name="briefcase-outline" size={20} color={tokens.text} />
          <Text style={[styles.archiveLabel, { color: tokens.text }]}>Archive</Text>
        </Pressable>
      }
    >
      <View style={styles.monthHeader}>
        <MonthNavButton
          label="Prev"
          icon="chevron-back"
          align="left"
          tokens={tokens}
          onPress={() => setCurrentMonth((value) => subMonths(value, 1))}
        />
        <Text style={[styles.monthLabel, { color: tokens.text }]}>{format(currentMonth, 'MMMM yyyy')}</Text>
        <MonthNavButton
          label="Next"
          icon="chevron-forward"
          align="right"
          tokens={tokens}
          onPress={() => setCurrentMonth((value) => addMonths(value, 1))}
        />
      </View>

      <View style={styles.weekdaysRow}>
        {weekdayLabels.map((label) => (
          <Text key={label} style={[styles.weekdayLabel, { color: tokens.textMuted }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const selected = selectedDate === dateKey;
          const isToday = todayKey === dateKey;
          const inMonth = isSameMonth(day, currentMonth);
          const dayStatuses = habits.map((habit) => getLogStatusForHabitOnDate(habit, logs, dateKey));
          const status = statusPriority.find((entry) => dayStatuses.includes(entry)) ?? 'pending';
          const dayColors = getDayCellColors({ selected, isToday, inMonth, tokens });
          const dotColor = getStatusDotColor(status, tokens, { selected, isToday });

          return (
            <Pressable
              key={dateKey}
              accessibilityRole="button"
              accessibilityLabel={`Open ${format(day, 'MMMM d, yyyy')}`}
              style={[
                styles.dayCell,
                {
                  backgroundColor: dayColors.backgroundColor,
                  borderColor: dayColors.borderColor,
                },
                !inMonth && styles.dayMuted,
                (selected || isToday) && styles.daySelected,
              ]}
              onPress={() => setSelectedDate(dateKey)}
            >
              <View style={[styles.dayInnerGlow, { backgroundColor: dayColors.glowColor }]} />
              <View style={[styles.dayInnerStroke, { borderColor: dayColors.innerBorderColor }]} />
              <Text style={[styles.dayLabel, { color: dayColors.textColor }]}>{format(day, 'd')}</Text>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.detailsCard,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
          },
        ]}
      >
        <View style={styles.detailsHeader}>
          <View style={[styles.calendarChip, { backgroundColor: tokens.primarySoft }]}>
            <Ionicons name="calendar-clear-outline" size={18} color={tokens.primary} />
          </View>
          <View style={styles.detailsHeaderText}>
            <Text style={[styles.detailsEyebrow, { color: tokens.textMuted }]}>Selected date</Text>
            <Text style={[styles.detailsDate, { color: tokens.text }]}>{selectedDateLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={tokens.textMuted} />
        </View>

        {habitsForDate.length ? (
          <View style={styles.habitList}>
            {habitsForDate.map(({ habit, status }) => (
              <Pressable
                key={habit.id}
                accessibilityRole="button"
                style={[
                  styles.habitRow,
                  {
                    backgroundColor: tokens.mode === 'light' ? '#ffffff' : '#fbfcff',
                    borderColor: tokens.mode === 'light' ? '#edf2f8' : '#e5eaf2',
                  },
                ]}
                onPress={() => router.push(`/habit/${habit.id}`)}
              >
                <View style={[styles.habitIcon, { backgroundColor: habit.color }]}>
                  <Ionicons name={resolveHabitIcon(habit.icon)} size={18} color="#ffffff" />
                </View>
                <View style={styles.habitTextWrap}>
                  <Text style={styles.habitTitle}>{habit.name}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: getStatusPillColor(status, tokens) }]}>
                  <Text style={[styles.statusLabel, { color: getStatusTextColor(status, tokens) }]}>{formatStatusLabel(status)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              </Pressable>
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.emptyPanel,
              {
                backgroundColor: tokens.mode === 'light' ? '#ffffff' : '#0c1522',
                borderColor: tokens.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: tokens.text }]}>No logged habits for this day</Text>
            <Text style={[styles.emptySubtitle, { color: tokens.textMuted }]}>
              Completed, partial, skipped, or missed habits will appear here once that day has activity.
            </Text>
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

function MonthNavButton({
  label,
  icon,
  align,
  onPress,
  tokens,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  align: 'left' | 'right';
  onPress: () => void;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  const leading = align === 'left';

  return (
    <Pressable
      accessibilityRole="button"
      style={[
        styles.navButton,
        {
          backgroundColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.78)' : tokens.surface,
          borderColor: tokens.border,
        },
      ]}
      onPress={onPress}
    >
      {leading ? <Ionicons name={icon} size={20} color={tokens.textMuted} /> : null}
      <Text style={[styles.navLabel, { color: tokens.text }]}>{label}</Text>
      {!leading ? <Ionicons name={icon} size={20} color={tokens.textMuted} /> : null}
    </Pressable>
  );
}

function getDayCellColors({
  selected,
  isToday,
  inMonth,
  tokens,
}: {
  selected: boolean;
  isToday: boolean;
  inMonth: boolean;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  if (selected) {
    return {
      backgroundColor: '#173f75',
      borderColor: '#2d5f9c',
      innerBorderColor: 'rgba(255,255,255,0.06)',
      glowColor: 'rgba(255,255,255,0.045)',
      textColor: '#ffffff',
    };
  }

  if (isToday) {
    return {
      backgroundColor: '#fbfbfd',
      borderColor: '#ffffff',
      innerBorderColor: 'rgba(15,23,42,0.06)',
      glowColor: 'rgba(255,255,255,0.4)',
      textColor: '#0f1d30',
    };
  }

  if (tokens.mode === 'light') {
    return {
      backgroundColor: inMonth ? '#f7faff' : '#edf2f9',
      borderColor: inMonth ? '#d7e2f0' : '#dfe7f2',
      innerBorderColor: 'rgba(255,255,255,0.38)',
      glowColor: 'rgba(255,255,255,0.18)',
      textColor: inMonth ? '#10243e' : '#7f8ea3',
    };
  }

  return {
    backgroundColor: inMonth ? 'rgba(19, 31, 49, 0.96)' : 'rgba(14, 24, 39, 0.9)',
    borderColor: inMonth ? 'rgba(39, 61, 92, 0.92)' : 'rgba(33, 50, 76, 0.72)',
    innerBorderColor: inMonth ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.025)',
    glowColor: inMonth ? 'rgba(255,255,255,0.016)' : 'rgba(255,255,255,0.01)',
    textColor: inMonth ? '#f2f7ff' : 'rgba(242,247,255,0.42)',
  };
}

function getStatusDotColor(
  status: HabitLogStatus,
  tokens: ReturnType<typeof useThemeTokens>,
  flags: { selected: boolean; isToday: boolean },
) {
  if (flags.selected) {
    if (status === 'partial') {
      return '#f8a41b';
    }
    if (status === 'completed') {
      return '#ffffff';
    }
    if (status === 'missed') {
      return '#ff8a65';
    }
    return 'rgba(255,255,255,0.3)';
  }

  if (flags.isToday) {
    return 'rgba(15, 23, 42, 0.22)';
  }

  switch (status) {
    case 'completed':
      return tokens.success;
    case 'partial':
      return tokens.warning;
    case 'missed':
      return tokens.danger;
    case 'skipped':
      return tokens.textMuted;
    default:
      return tokens.mode === 'light' ? '#cbd5e1' : '#475569';
  }
}

function getStatusPillColor(status: HabitLogStatus, tokens: ReturnType<typeof useThemeTokens>) {
  switch (status) {
    case 'completed':
      return tokens.mode === 'light' ? '#dcfce7' : '#163321';
    case 'partial':
      return tokens.mode === 'light' ? '#dbeafe' : '#15253c';
    case 'missed':
      return tokens.mode === 'light' ? '#fee2e2' : '#351520';
    case 'skipped':
      return tokens.mode === 'light' ? '#e2e8f0' : '#202938';
    default:
      return tokens.surfaceMuted;
  }
}

function getStatusTextColor(status: HabitLogStatus, tokens: ReturnType<typeof useThemeTokens>) {
  switch (status) {
    case 'completed':
      return tokens.mode === 'light' ? '#166534' : '#86efac';
    case 'partial':
      return tokens.mode === 'light' ? '#1d4ed8' : '#bfdbfe';
    case 'missed':
      return tokens.mode === 'light' ? '#b91c1c' : '#fda4af';
    case 'skipped':
      return tokens.mode === 'light' ? '#475569' : '#cbd5e1';
    default:
      return tokens.textMuted;
  }
}

function formatStatusLabel(status: HabitLogStatus) {
  switch (status) {
    case 'completed':
      return 'Done';
    case 'partial':
      return 'Partial';
    case 'missed':
      return 'Missed';
    case 'skipped':
      return 'Skipped';
    default:
      return 'Pending';
  }
}

function resolveHabitIcon(icon: string): React.ComponentProps<typeof Ionicons>['name'] {
  const iconMap: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
    drop: 'water',
    bolt: 'flash',
  };
  const normalized = iconMap[icon] ?? icon;
  const allowedIcons: ReadonlyArray<React.ComponentProps<typeof Ionicons>['name']> = [
    'sparkles',
    'water',
    'leaf',
    'barbell',
    'moon',
    'book',
    'walk',
    'flame',
    'heart',
    'cafe',
    'nutrition',
    'flash',
    'checkmark-circle',
    'checkbox',
    'sunny',
  ];

  return allowedIcons.includes(normalized as React.ComponentProps<typeof Ionicons>['name'])
    ? (normalized as React.ComponentProps<typeof Ionicons>['name'])
    : 'sparkles';
}

function buildCalendarGrid(currentMonth: Date) {
  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

const styles = StyleSheet.create({
  archiveButton: {
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  archiveLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
  },
  navButton: {
    minWidth: 74,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  weekdayLabel: {
    width: '13.4%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 13,
  },
  dayCell: {
    width: '12.95%',
    aspectRatio: 1,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  dayMuted: {
    opacity: 0.62,
  },
  daySelected: {
    shadowColor: '#ffffff',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  dayInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
  },
  dayInnerStroke: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 21,
    borderWidth: 1,
  },
  dayLabel: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 18,
    transform: [{ translateY: -6 }],
  },
  dot: {
    position: 'absolute',
    bottom: 9,
    alignSelf: 'center',
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  detailsCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarChip: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsHeaderText: {
    flex: 1,
    gap: 2,
  },
  detailsEyebrow: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsDate: {
    fontSize: 17,
    fontWeight: '800',
  },
  habitList: {
    gap: 10,
  },
  habitRow: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  habitIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitTextWrap: {
    flex: 1,
  },
  habitTitle: {
    color: '#10243e',
    fontSize: 16,
    fontWeight: '800',
  },
  statusPill: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyPanel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
});
