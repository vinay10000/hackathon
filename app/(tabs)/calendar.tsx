import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { ScreenShell } from '@/src/components/screen-shell';
import { getLogStatusForHabitOnDate, isHabitScheduledForDate } from '@/src/domain/habits';
import { useAppStore } from '@/src/store/app-store';
import { useThemeTokens } from '@/src/theme/colors';
import { HabitLogStatus } from '@/src/types/habits';

const weekdayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

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
          const status = getCalendarDayStatus(habits, logs, dateKey, todayKey);
          const dayColors = getDayCellColors({ selected, isToday, inMonth, status, tokens });

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
  status,
  tokens,
}: {
  selected: boolean;
  isToday: boolean;
  inMonth: boolean;
  status: HabitLogStatus;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  const base = getStatusDayCellColors(status, tokens, inMonth);

  if (selected) {
    return {
      backgroundColor: base.selectedBackgroundColor,
      borderColor: base.selectedBorderColor,
      innerBorderColor: 'rgba(255,255,255,0.08)',
      glowColor: 'rgba(255,255,255,0.05)',
      textColor: '#ffffff',
    };
  }

  if (isToday) {
    return {
      backgroundColor: base.todayBackgroundColor,
      borderColor: base.todayBorderColor,
      innerBorderColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.08)',
      glowColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)',
      textColor: base.todayTextColor,
    };
  }

  return {
    backgroundColor: base.backgroundColor,
    borderColor: base.borderColor,
    innerBorderColor: base.innerBorderColor,
    glowColor: base.glowColor,
    textColor: base.textColor,
  };
}

function getStatusDayCellColors(status: HabitLogStatus, tokens: ReturnType<typeof useThemeTokens>, inMonth: boolean) {
  switch (status) {
    case 'completed':
      return {
        backgroundColor: tokens.mode === 'light' ? '#dcfce7' : '#163321',
        borderColor: tokens.mode === 'light' ? '#86efac' : '#1f5b35',
        innerBorderColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.04)',
        glowColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.015)',
        textColor: tokens.mode === 'light' ? '#166534' : '#dcfce7',
        todayBackgroundColor: tokens.mode === 'light' ? '#bbf7d0' : '#1b4332',
        todayBorderColor: tokens.mode === 'light' ? '#4ade80' : '#2e7d52',
        todayTextColor: tokens.mode === 'light' ? '#14532d' : '#f0fdf4',
        selectedBackgroundColor: tokens.mode === 'light' ? '#15803d' : '#14532d',
        selectedBorderColor: tokens.mode === 'light' ? '#166534' : '#22c55e',
      };
    case 'partial':
      return {
        backgroundColor: tokens.mode === 'light' ? '#fef3c7' : '#3a2a14',
        borderColor: tokens.mode === 'light' ? '#fcd34d' : '#8b5a1e',
        innerBorderColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.04)',
        glowColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.015)',
        textColor: tokens.mode === 'light' ? '#92400e' : '#fde68a',
        todayBackgroundColor: tokens.mode === 'light' ? '#fde68a' : '#4a3317',
        todayBorderColor: tokens.mode === 'light' ? '#f59e0b' : '#c0841a',
        todayTextColor: tokens.mode === 'light' ? '#78350f' : '#fffbeb',
        selectedBackgroundColor: tokens.mode === 'light' ? '#d97706' : '#92400e',
        selectedBorderColor: tokens.mode === 'light' ? '#92400e' : '#f59e0b',
      };
    case 'missed':
      return {
        backgroundColor: tokens.mode === 'light' ? '#fee2e2' : '#351520',
        borderColor: tokens.mode === 'light' ? '#fca5a5' : '#7f1d1d',
        innerBorderColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.04)',
        glowColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.015)',
        textColor: tokens.mode === 'light' ? '#b91c1c' : '#fecdd3',
        todayBackgroundColor: tokens.mode === 'light' ? '#fecaca' : '#3f1721',
        todayBorderColor: tokens.mode === 'light' ? '#ef4444' : '#be123c',
        todayTextColor: tokens.mode === 'light' ? '#7f1d1d' : '#fff1f2',
        selectedBackgroundColor: tokens.mode === 'light' ? '#dc2626' : '#881337',
        selectedBorderColor: tokens.mode === 'light' ? '#991b1b' : '#fb7185',
      };
    case 'skipped':
      return {
        backgroundColor: tokens.mode === 'light' ? '#e2e8f0' : '#202938',
        borderColor: tokens.mode === 'light' ? '#cbd5e1' : '#334155',
        innerBorderColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.035)',
        glowColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.01)',
        textColor: tokens.mode === 'light' ? '#475569' : '#cbd5e1',
        todayBackgroundColor: tokens.mode === 'light' ? '#cbd5e1' : '#293445',
        todayBorderColor: tokens.mode === 'light' ? '#94a3b8' : '#475569',
        todayTextColor: tokens.mode === 'light' ? '#334155' : '#f8fafc',
        selectedBackgroundColor: tokens.mode === 'light' ? '#64748b' : '#334155',
        selectedBorderColor: tokens.mode === 'light' ? '#475569' : '#94a3b8',
      };
    default:
      if (tokens.mode === 'light') {
        return {
          backgroundColor: inMonth ? '#f7faff' : '#edf2f9',
          borderColor: inMonth ? '#d7e2f0' : '#dfe7f2',
          innerBorderColor: 'rgba(255,255,255,0.38)',
          glowColor: 'rgba(255,255,255,0.18)',
          textColor: inMonth ? '#10243e' : '#7f8ea3',
          todayBackgroundColor: '#fbfbfd',
          todayBorderColor: '#ffffff',
          todayTextColor: '#0f1d30',
          selectedBackgroundColor: '#173f75',
          selectedBorderColor: '#2d5f9c',
        };
      }

      return {
        backgroundColor: inMonth ? 'rgba(19, 31, 49, 0.96)' : 'rgba(14, 24, 39, 0.9)',
        borderColor: inMonth ? 'rgba(39, 61, 92, 0.92)' : 'rgba(33, 50, 76, 0.72)',
        innerBorderColor: inMonth ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.025)',
        glowColor: inMonth ? 'rgba(255,255,255,0.016)' : 'rgba(255,255,255,0.01)',
        textColor: inMonth ? '#f2f7ff' : 'rgba(242,247,255,0.42)',
        todayBackgroundColor: 'rgba(28, 40, 58, 0.98)',
        todayBorderColor: 'rgba(255,255,255,0.18)',
        todayTextColor: '#f8fbff',
        selectedBackgroundColor: '#173f75',
        selectedBorderColor: '#4f83c2',
      };
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

function getCalendarDayStatus(
  habits: ReturnType<typeof useAppStore.getState>['habits'],
  logs: ReturnType<typeof useAppStore.getState>['logs'],
  dateKey: string,
  todayKey: string,
): HabitLogStatus {
  const scheduledHabits = habits.filter((habit) => isHabitScheduledForDate(habit, dateKey, logs));

  if (!scheduledHabits.length) {
    return 'pending';
  }

  const completedCount = scheduledHabits.filter(
    (habit) => getLogStatusForHabitOnDate(habit, logs, dateKey) === 'completed',
  ).length;

  if (completedCount === scheduledHabits.length) {
    return 'completed';
  }

  if (completedCount > 0) {
    return 'partial';
  }

  if (dateKey > todayKey) {
    return 'pending';
  }

  return 'missed';
}

const styles = StyleSheet.create({
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
    borderRadius: 999,
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
    borderRadius: 999,
    borderWidth: 1,
  },
  dayLabel: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 18,
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
