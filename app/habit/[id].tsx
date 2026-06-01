import { Ionicons } from '@expo/vector-icons';
import { addMonths, format, isAfter, isSameMonth, isToday, parseISO, startOfMonth, subMonths } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/src/components/empty-state';
import { buildMonthGrid, formatScheduleLabel, getLogStatusForHabitOnDate, isHabitScheduledForDate } from '@/src/domain/habits';
import { useAppStore, useHabitInsights } from '@/src/store/app-store';
import { ThemeTokens, useThemeTokens } from '@/src/theme/colors';
import { Habit, HabitLog, HabitLogStatus } from '@/src/types/habits';

type TimelineStatus = 'completed' | 'partial' | 'skipped' | 'missed' | 'started';

type TimelineEvent = {
  id: string;
  date: string;
  status: TimelineStatus;
  title: string;
  badgeLabel: string;
  badgeTone: 'success' | 'primary' | 'warning' | 'danger' | 'muted';
  note?: string;
  valueLabel?: string;
  milestoneLabel?: string;
};

export default function HabitDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const habit = useAppStore((state) => state.habits.find((item) => item.id === params.id));
  const archiveHabit = useAppStore((state) => state.archiveHabit);
  const restoreHabit = useAppStore((state) => state.restoreHabit);
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  const toggleHabitComplete = useAppStore((state) => state.toggleHabitComplete);
  const insight = useHabitInsights(params.id);
  const tokens = useThemeTokens();
  const isLight = tokens.mode === 'light';
  const insets = useSafeAreaInsets();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));

  if (!habit || !insight) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tokens.background }]}>
        <View style={styles.missingWrap}>
          <EmptyState title="Habit not found" subtitle="This habit may have been deleted or archived outside this screen." />
        </View>
      </SafeAreaView>
    );
  }

  const scheduleLabel = formatScheduleLabel(habit.schedule);
  const reminderLabel = habit.reminders[0]?.enabled ? habit.reminders[0].time : 'Off';
  const timelineEvents = buildTimelineEvents(habit, insight.logs);
  const monthSections = groupTimelineEventsByMonth(timelineEvents);
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const calendarDays = buildMonthGrid(calendarMonth);
  const currentMonthStart = startOfMonth(today);
  const canGoToNextMonth = !isSameMonth(calendarMonth, currentMonthStart) && !isAfter(addMonths(calendarMonth, 1), currentMonthStart);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tokens.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 156 + Math.max(insets.bottom, 12) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[
              styles.headerButton,
              {
                backgroundColor: isLight ? '#ffffff' : '#09111d',
                borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)',
              },
            ]}
          >
            <Ionicons name="chevron-back" size={18} color={isLight ? '#10243e' : '#e2e8f0'} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit habit"
            onPress={() => router.push(`/habit/edit/${habit.id}`)}
            style={[
              styles.headerButtonWide,
              {
                backgroundColor: isLight ? '#e7f0ff' : 'rgba(124,58,237,0.16)',
                borderColor: isLight ? '#b8cff8' : 'rgba(167,139,250,0.92)',
              },
            ]}
          >
            <Ionicons name="create-outline" size={16} color={isLight ? '#2563eb' : '#c4b5fd'} />
            <Text style={[styles.headerButtonText, { color: isLight ? '#2563eb' : '#f8fafc' }]}>Edit</Text>
          </Pressable>
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
            <View style={[styles.heroIconWrap, { backgroundColor: `${habit.color}22`, borderColor: `${habit.color}55` }]}>
              <Ionicons name={habit.icon as React.ComponentProps<typeof Ionicons>['name']} size={34} color={habit.color} />
            </View>

            <View style={styles.heroCopy}>
              <Text style={[styles.heroTitle, { color: isLight ? '#10243e' : '#ffffff' }]}>{habit.name}</Text>
              <Text style={[styles.heroSubtitle, { color: isLight ? habit.color : '#4ade80' }]}>{habit.category}</Text>

              <View style={styles.heroChipRow}>
                <View style={[styles.heroChip, { backgroundColor: isLight ? '#eef4ff' : 'rgba(15,23,42,0.24)', borderColor: isLight ? '#d9e6f3' : 'rgba(148,163,184,0.18)' }]}>
                  <Ionicons name="repeat-outline" size={13} color={isLight ? '#2563eb' : '#93c5fd'} />
                  <Text style={[styles.heroChipText, { color: isLight ? '#355070' : '#dbeafe' }]}>{scheduleLabel}</Text>
                </View>
                <View style={[styles.heroChip, { backgroundColor: isLight ? '#eefcf4' : 'rgba(15,23,42,0.24)', borderColor: isLight ? '#d9e6f3' : 'rgba(148,163,184,0.18)' }]}>
                  <Ionicons name="notifications-outline" size={13} color={isLight ? '#16a34a' : '#4ade80'} />
                  <Text style={[styles.heroChipText, { color: isLight ? '#355070' : '#dbeafe' }]}>Reminder {reminderLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.metricRow}>
            <MetricTile label="Current streak" value={String(insight.streak.current)} tint="#22c55e" mode={tokens.mode} />
            <MetricTile label="Best streak" value={String(insight.streak.best)} tint="#38bdf8" mode={tokens.mode} />
            <MetricTile label="Completion" value={`${insight.completionRate}%`} tint={habit.color} mode={tokens.mode} />
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
            },
          ]}
        >
          <View style={styles.calendarHeader}>
            <Text style={[styles.sectionTitle, { color: tokens.text }]}>Calendar</Text>
            <Text style={[styles.calendarHint, { color: tokens.textMuted }]}>Tap any past or current scheduled day to mark it complete.</Text>
          </View>

          <View style={styles.calendarMonthHeader}>
            <CalendarNavButton direction="left" tokens={tokens} onPress={() => setCalendarMonth((value) => subMonths(value, 1))} />
            <Text style={[styles.calendarMonthTitle, { color: tokens.text }]}>{format(calendarMonth, 'MMMM yyyy')}</Text>
            <CalendarNavButton
              direction="right"
              tokens={tokens}
              disabled={!canGoToNextMonth}
              onPress={() => {
                if (canGoToNextMonth) {
                  setCalendarMonth((value) => addMonths(value, 1));
                }
              }}
            />
          </View>

          <View style={styles.calendarWeekHeader}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
              <Text key={label} style={[styles.calendarWeekday, { color: tokens.textMuted }]}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const inMonth = isSameMonth(day, calendarMonth);
              const isFuture = dateKey > todayKey;
              const isScheduled = inMonth && isHabitScheduledForDate(habit, dateKey, insight.logs);
              const status = getLogStatusForHabitOnDate(habit, insight.logs, dateKey);
              const cellColors = getHabitCalendarDayColors({
                tokens,
                status,
                inMonth,
                isFuture,
                isCurrentDay: dateKey === todayKey,
                isScheduled,
              });
              const isPressable = inMonth && isScheduled && !isFuture;

              return (
                <Pressable
                  key={dateKey}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark ${format(day, 'MMMM d, yyyy')} as complete`}
                  disabled={!isPressable}
                  onPress={() => toggleHabitComplete(habit.id, dateKey)}
                  style={[
                    styles.calendarDayCell,
                    {
                      backgroundColor: cellColors.backgroundColor,
                      borderColor: cellColors.borderColor,
                      opacity: inMonth ? 1 : 0,
                    },
                    isPressable && styles.calendarDayCellActive,
                  ]}
                >
                  <Text style={[styles.calendarDayLabel, { color: cellColors.textColor }]}>{format(day, 'd')}</Text>
                  {status === 'completed' ? <Ionicons name="checkmark" size={12} color={cellColors.accentColor} style={styles.calendarDayIcon} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
            },
          ]}
        >
          <View style={styles.timelineHeader}>
            <View style={styles.timelineHeaderCopy}>
              <Ionicons name="git-branch-outline" size={18} color={tokens.success} />
              <Text style={[styles.sectionTitle, { color: tokens.text }]}>Timeline</Text>
            </View>
          </View>
          {monthSections.length ? (
            monthSections.map((section) => (
              <View key={section.monthKey} style={styles.timelineSection}>
                <View style={styles.timelineMonthRow}>
                  <Text style={[styles.timelineMonthLabel, { color: tokens.textMuted }]}>{section.monthLabel}</Text>
                  <View style={[styles.timelineMonthDivider, { backgroundColor: tokens.border }]} />
                </View>

                {section.events.map((event, index) => {
                  const statusTone = getTimelineTone(event.badgeTone, tokens);
                  const eventDate = parseISO(event.date);
                  const showLine = index < section.events.length - 1;

                  return (
                    <View key={event.id} style={styles.timelineItem}>
                      <View style={styles.timelineRail}>
                        <View style={[styles.timelineDot, { backgroundColor: statusTone.soft, borderColor: statusTone.border, shadowColor: statusTone.glow }]}>
                          <Ionicons name={getTimelineIcon(event.status)} size={15} color={statusTone.icon} />
                        </View>
                        {showLine ? <View style={[styles.timelineLine, { backgroundColor: tokens.border }]} /> : null}
                      </View>

                      <View style={styles.timelineContent}>
                        <View style={styles.timelineMetaRow}>
                          <Text style={[styles.timelineDate, { color: tokens.text }]}>{format(eventDate, 'MMM d')}</Text>
                          <Text style={[styles.timelineWeekday, { color: tokens.textMuted }]}>{format(eventDate, 'EEE')}</Text>
                          {isToday(eventDate) ? (
                            <View style={[styles.timelineTodayBadge, { backgroundColor: tokens.primarySoft, borderColor: tokens.primary }]}>
                              <Text style={[styles.timelineTodayText, { color: tokens.primary }]}>Today</Text>
                            </View>
                          ) : null}
                          <View style={[styles.timelineStatusBadge, { backgroundColor: statusTone.soft, borderColor: statusTone.border }]}>
                            <Text style={[styles.timelineStatusText, { color: statusTone.text }]}>{event.badgeLabel}</Text>
                          </View>
                        </View>

                        <View style={[styles.timelineCard, { backgroundColor: tokens.surfaceMuted, borderColor: tokens.border }]}>
                          <Text style={[styles.timelineTitle, { color: tokens.text }]}>{event.title}</Text>
                          {event.milestoneLabel ? <Text style={[styles.timelineMilestone, { color: statusTone.text }]}>{event.milestoneLabel}</Text> : null}
                          {event.valueLabel || event.note ? (
                            <Text style={[styles.timelineBody, { color: tokens.textMuted }]}>
                              {[event.valueLabel, event.note].filter(Boolean).join(' • ')}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          ) : (
            <Text style={[styles.emptyHint, { color: tokens.textMuted }]}>No timeline entries yet. Once this habit has real check-ins, they will appear here.</Text>
          )}
        </View>

        <View
          style={[
            styles.actionCard,
            {
              backgroundColor: isLight ? '#ffffff' : '#09111d',
              borderColor: isLight ? '#d9e6f3' : 'rgba(96,165,250,0.12)',
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>Actions</Text>

          {habit.archivedAt ? (
            <ActionButton
              label="Restore habit"
              icon="refresh-outline"
              backgroundColor={isLight ? '#e9f9ef' : '#14532d'}
              borderColor={isLight ? '#bde6c9' : 'rgba(74, 222, 128, 0.3)'}
              textColor={isLight ? '#166534' : '#ffffff'}
              onPress={() => restoreHabit(habit.id)}
            />
          ) : (
            <ActionButton
              label="Archive habit"
              icon="archive-outline"
              backgroundColor={isLight ? '#eef4ff' : '#172554'}
              borderColor={isLight ? '#c9daf8' : 'rgba(96, 165, 250, 0.3)'}
              textColor={isLight ? '#1d4ed8' : '#ffffff'}
              onPress={() => {
                archiveHabit(habit.id);
                router.replace('/today');
              }}
            />
          )}

          {confirmingDelete ? (
            <View style={[styles.deleteCard, { backgroundColor: isLight ? '#fff1f2' : '#3f0d14', borderColor: isLight ? '#fecdd3' : 'rgba(248,113,113,0.34)' }]}>
              <Text style={[styles.deleteTitle, { color: isLight ? '#9f1239' : '#ffffff' }]}>Delete permanently?</Text>
              <Text style={[styles.deleteBody, { color: isLight ? '#9f1239' : 'rgba(254,226,226,0.9)' }]}>This removes the habit and every log tied to it. Archive is safer if you want to keep the history.</Text>
              <View style={styles.deleteActions}>
                <ActionButton
                  label="Cancel"
                  icon="close-outline"
                  backgroundColor={isLight ? '#ffffff' : '#172033'}
                  borderColor={isLight ? '#d9e6f3' : 'rgba(148,163,184,0.22)'}
                  textColor={isLight ? '#10243e' : '#ffffff'}
                  onPress={() => setConfirmingDelete(false)}
                />
                <ActionButton
                  label="Delete habit"
                  icon="trash-outline"
                  backgroundColor={isLight ? '#ffe4e6' : '#7f1d1d'}
                  borderColor={isLight ? '#fda4af' : 'rgba(248,113,113,0.34)'}
                  textColor={isLight ? '#be123c' : '#ffffff'}
                  onPress={async () => {
                    await deleteHabit(habit.id);
                    router.replace('/today');
                  }}
                />
              </View>
            </View>
          ) : (
            <ActionButton
              label="Delete habit"
              icon="trash-outline"
              backgroundColor={isLight ? '#fff1f2' : '#4c0519'}
              borderColor={isLight ? '#fecdd3' : 'rgba(248,113,113,0.34)'}
              textColor={isLight ? '#be123c' : '#ffffff'}
              onPress={() => setConfirmingDelete(true)}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricTile({ label, value, tint, mode }: { label: string; value: string; tint: string; mode: 'light' | 'dark' | 'amoled' }) {
  return (
    <View style={[styles.metricTile, { borderColor: `${tint}33`, backgroundColor: `${tint}14` }]}>
      <Text style={[styles.metricValue, { color: mode === 'light' ? '#10243e' : '#ffffff' }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: tint }]}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  backgroundColor,
  borderColor,
  textColor,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable onPress={() => void onPress()} style={[styles.actionButton, { backgroundColor, borderColor }]}>
      <Ionicons name={icon} size={18} color={textColor} />
      <Text style={[styles.actionText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

function CalendarNavButton({
  direction,
  disabled,
  onPress,
  tokens,
}: {
  direction: 'left' | 'right';
  disabled?: boolean;
  onPress: () => void;
  tokens: ThemeTokens;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.calendarNavButton,
        {
          backgroundColor: disabled ? tokens.surfaceMuted : tokens.surface,
          borderColor: tokens.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Ionicons name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} size={20} color={tokens.text} />
    </Pressable>
  );
}

function getHabitCalendarDayColors({
  tokens,
  status,
  inMonth,
  isFuture,
  isCurrentDay,
  isScheduled,
}: {
  tokens: ThemeTokens;
  status: HabitLogStatus;
  inMonth: boolean;
  isFuture: boolean;
  isCurrentDay: boolean;
  isScheduled: boolean;
}) {
  if (!inMonth) {
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: 'transparent',
      accentColor: 'transparent',
    };
  }

  if (isFuture) {
    return {
      backgroundColor: tokens.surface,
      borderColor: tokens.border,
      textColor: tokens.textMuted,
      accentColor: tokens.textMuted,
    };
  }

  if (status === 'completed') {
    return {
      backgroundColor: tokens.success,
      borderColor: tokens.success,
      textColor: tokens.mode === 'light' ? '#ffffff' : '#04110a',
      accentColor: tokens.mode === 'light' ? '#ffffff' : '#04110a',
    };
  }

  if (status === 'partial') {
    return {
      backgroundColor: tokens.primarySoft,
      borderColor: tokens.primary,
      textColor: tokens.primary,
      accentColor: tokens.primary,
    };
  }

  if (status === 'skipped') {
    return {
      backgroundColor: `${tokens.warning}15`,
      borderColor: `${tokens.warning}66`,
      textColor: tokens.warning,
      accentColor: tokens.warning,
    };
  }

  if (status === 'missed') {
    return {
      backgroundColor: `${tokens.danger}14`,
      borderColor: `${tokens.danger}55`,
      textColor: tokens.danger,
      accentColor: tokens.danger,
    };
  }

  if (isCurrentDay) {
    return {
      backgroundColor: tokens.primarySoft,
      borderColor: tokens.primary,
      textColor: tokens.primary,
      accentColor: tokens.primary,
    };
  }

  if (isScheduled) {
    return {
      backgroundColor: tokens.surface,
      borderColor: tokens.border,
      textColor: tokens.text,
      accentColor: tokens.text,
    };
  }

  return {
    backgroundColor: tokens.surfaceMuted,
    borderColor: tokens.border,
    textColor: tokens.textMuted,
    accentColor: tokens.textMuted,
  };
}

function buildTimelineEvents(habit: Habit, logs: HabitLog[]) {
  const completionMilestones = new Set([7, 14, 21, 30]);
  let completionRun = 0;

  const logEvents = [...logs]
    .filter((log): log is HabitLog & { status: Exclude<HabitLog['status'], 'pending'> } => log.status !== 'pending')
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((log) => {
      completionRun = log.status === 'completed' ? completionRun + 1 : 0;
      const valueLabel = formatLogValue(log.value, habit.unit);
      const title = getTimelineTitle(log.status);
      const tone = getBadgeTone(log.status);
      const milestoneLabel = completionMilestones.has(completionRun) ? `${completionRun}-day streak` : undefined;

      const event: TimelineEvent = {
        id: log.id,
        date: log.date,
        status: log.status,
        title,
        badgeLabel: toTitleCase(log.status),
        badgeTone: tone,
        note: log.note?.trim() || undefined,
        valueLabel,
      };

      if (!milestoneLabel) {
        return [event];
      }

      return [
        event,
        {
          id: `${log.id}-milestone`,
          date: log.date,
          status: 'completed',
          title: milestoneLabel,
          badgeLabel: 'Milestone',
          badgeTone: 'success',
          milestoneLabel: `${completionRun} real completed days reached`,
        } satisfies TimelineEvent,
      ];
    });

  return [
    {
      id: `${habit.id}-started`,
      date: habit.startDate,
      status: 'started' as const,
      title: 'Habit started',
      badgeLabel: 'Started',
      badgeTone: 'primary' as const,
      note: habit.description || undefined,
    },
    ...logEvents,
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

function groupTimelineEventsByMonth(events: TimelineEvent[]) {
  const grouped = new Map<string, TimelineEvent[]>();

  for (const event of events) {
    const monthKey = event.date.slice(0, 7);
    const existing = grouped.get(monthKey) ?? [];
    existing.push(event);
    grouped.set(monthKey, existing);
  }

  return Array.from(grouped.entries()).map(([monthKey, monthEvents]) => ({
    monthKey,
    monthLabel: format(parseISO(`${monthKey}-01`), 'MMMM yyyy'),
    events: monthEvents,
  }));
}

function getTimelineTone(tone: TimelineEvent['badgeTone'], tokens: ThemeTokens) {
  switch (tone) {
    case 'success':
      return {
        soft: `${tokens.success}20`,
        border: `${tokens.success}55`,
        text: tokens.success,
        icon: tokens.success,
        glow: tokens.success,
      };
    case 'primary':
      return {
        soft: `${tokens.primary}20`,
        border: `${tokens.primary}55`,
        text: tokens.primary,
        icon: tokens.primary,
        glow: tokens.primary,
      };
    case 'warning':
      return {
        soft: `${tokens.warning}20`,
        border: `${tokens.warning}55`,
        text: tokens.warning,
        icon: tokens.warning,
        glow: tokens.warning,
      };
    case 'danger':
      return {
        soft: `${tokens.danger}20`,
        border: `${tokens.danger}55`,
        text: tokens.danger,
        icon: tokens.danger,
        glow: tokens.danger,
      };
    default:
      return {
        soft: `${tokens.textMuted}18`,
        border: `${tokens.textMuted}40`,
        text: tokens.textMuted,
        icon: tokens.textMuted,
        glow: tokens.textMuted,
      };
  }
}

function getTimelineIcon(status: TimelineStatus) {
  switch (status) {
    case 'completed':
      return 'checkmark';
    case 'partial':
      return 'pause';
    case 'skipped':
      return 'play-skip-forward';
    case 'missed':
      return 'close';
    case 'started':
      return 'flag';
  }
}

function getTimelineTitle(status: TimelineStatus) {
  switch (status) {
    case 'completed':
      return 'Completed check-in';
    case 'partial':
      return 'Partial progress logged';
    case 'skipped':
      return 'Skipped for the day';
    case 'missed':
      return 'Missed scheduled day';
    case 'started':
      return 'Habit started';
  }
}

function getBadgeTone(status: TimelineStatus): TimelineEvent['badgeTone'] {
  switch (status) {
    case 'completed':
      return 'success';
    case 'partial':
      return 'primary';
    case 'skipped':
      return 'warning';
    case 'missed':
      return 'danger';
    default:
      return 'muted';
  }
}

function formatLogValue(value?: number, unit?: string) {
  if (value === undefined) {
    return undefined;
  }

  return unit ? `${value} ${unit}` : `Value ${value}`;
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  missingWrap: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonWide: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
    gap: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 16,
  },
  heroIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  heroChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  heroChip: {
    minHeight: 34,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricTile: {
    flex: 1,
    minHeight: 88,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  calendarHeader: {
    gap: 4,
  },
  calendarHint: {
    fontSize: 13,
    lineHeight: 19,
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  calendarMonthTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  calendarNavButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  calendarWeekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calendarDayCell: {
    width: '13.71%',
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendarDayCellActive: {
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  calendarDayLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  calendarDayIcon: {
    position: 'absolute',
    bottom: 8,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineHeaderCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineSection: {
    gap: 14,
  },
  timelineMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineMonthLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timelineMonthDivider: {
    flex: 1,
    height: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineRail: {
    width: 36,
    alignItems: 'center',
  },
  timelineDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
    borderRadius: 999,
    minHeight: 68,
  },
  timelineContent: {
    flex: 1,
    gap: 10,
  },
  timelineMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  timelineDate: {
    fontSize: 15,
    fontWeight: '800',
  },
  timelineWeekday: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineTodayBadge: {
    minHeight: 28,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineTodayText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timelineStatusBadge: {
    minHeight: 28,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 6,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  timelineMilestone: {
    fontSize: 14,
    fontWeight: '700',
  },
  timelineBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyHint: {
    fontSize: 14,
    lineHeight: 21,
  },
  actionCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  actionButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  deleteBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  deleteActions: {
    gap: 10,
  },
});
